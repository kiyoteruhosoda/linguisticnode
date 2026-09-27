/**
 * SyncDetailsModal - Detailed sync status and data information
 */

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import type { SyncStatus } from "../db/syncService";
import { syncUseCase } from "../sync/syncGatewayAdapter";
import { useAuth } from "../auth/useAuth";
import { getVocabFile } from "../db/indexeddb";
import { api } from "../api/client";
import type { VocabServerData } from "../db/types";

type SyncDetailsModalProps = {
  show: boolean;
  onClose: () => void;
};

export function SyncDetailsModal({ show, onClose }: SyncDetailsModalProps) {
  const { state } = useAuth();
  const isAuthenticated = state.status === "authed";
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Local and server data counts
  const [localWordCount, setLocalWordCount] = useState<number>(0);
  const [localMemoryCount, setLocalMemoryCount] = useState<number>(0);
  const [serverWordCount, setServerWordCount] = useState<number | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const s = await syncUseCase.getStatus();
      setStatus(s);
    } catch (err: unknown) {
      console.error("Failed to load sync status:", err);
    }
  };

  const loadLocalCounts = async () => {
    try {
      const file = await getVocabFile();
      if (file) {
        setLocalWordCount(file.words.length);
        setLocalMemoryCount(file.memory.length);
      }
    } catch (err) {
      console.error("Failed to load local counts:", err);
    }
  };

  const loadServerCounts = async () => {
    try {
      const serverData = await api.get<VocabServerData>("/vocab");
      setServerWordCount(serverData.file.words.length);
      setServerUpdatedAt(serverData.updatedAt);
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 404) {
        setServerWordCount(0);
        setServerUpdatedAt(null);
      } else {
        console.error("Failed to load server counts:", err);
      }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await syncUseCase.sync();

      if (result.status === "success") {
        await loadStatus();
        await loadLocalCounts();
        await loadServerCounts();
        setSuccessMessage("Sync completed successfully");
      } else if (result.status === "conflict") {
        setError("Conflict detected. Please resolve from the sync button.");
      } else {
        setError(result.message || "Sync failed");
      }
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 401) {
        setError("Authentication required");
      } else {
        setError(error.message || "Sync failed");
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadStatus();
      loadLocalCounts();
      if (isAuthenticated) {
        loadServerCounts();
      }
    }
  }, [show, isAuthenticated]);

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return "Never synced";

    try {
      const date = new Date(lastSyncAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    } catch {
      return lastSyncAt;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (!status) {
    return null;
  }

  return (
    <Modal show={show} onClose={onClose} title="Sync Details">
      <div className="vstack gap-3">
        {/* Connection Status */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-title d-flex align-items-center gap-2">
              <span
                className={`badge ${
                  status.dirty
                    ? "bg-warning text-dark"
                    : status.online
                    ? "bg-success"
                    : "bg-secondary"
                }`}
              >
                ●{" "}
                {status.dirty
                  ? "Unsaved Changes"
                  : status.online
                  ? "Online"
                  : "Offline"}
              </span>
              Status
            </h6>
            <p className="card-text small text-muted mb-0">
              {status.dirty
                ? "You have local changes that need to be synced"
                : status.online
                ? "Connected to server"
                : "Working in offline mode"}
            </p>
          </div>
        </div>

        {/* Local Data */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              <i className="fas fa-laptop me-2 text-primary" />
              Local Data
            </h6>
            <div className="row g-2">
              <div className="col-6">
                <div className="text-muted small">Words</div>
                <div className="fs-5 fw-bold">{localWordCount}</div>
              </div>
              <div className="col-6">
                <div className="text-muted small">Memory States</div>
                <div className="fs-5 fw-bold">{localMemoryCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Server Data */}
        {status.online && isAuthenticated && (
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">
                <i className="fas fa-cloud me-2 text-info" />
                Server Data
              </h6>
              {serverWordCount !== null ? (
                <>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="text-muted small">Words</div>
                      <div className="fs-5 fw-bold">{serverWordCount}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Last Updated</div>
                      <div className="small">{formatDateTime(serverUpdatedAt)}</div>
                    </div>
                  </div>
                  {serverWordCount !== localWordCount && (
                    <div className="alert alert-info mt-2 mb-0 py-2">
                      <i className="fas fa-info-circle me-2" />
                      <small>
                        {serverWordCount > localWordCount
                          ? `Server has ${serverWordCount - localWordCount} more words`
                          : `Local has ${localWordCount - serverWordCount} more words`}
                      </small>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted small">Loading server data...</div>
              )}
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2" />
            Login to view server data and sync
          </div>
        )}

        {/* Last Sync */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              <i className="fas fa-history me-2" />
              Sync History
            </h6>
            <div className="text-muted small mb-1">Last Synced</div>
            <div>{formatLastSync(status.lastSyncAt)}</div>
            {status.lastSyncAt && (
              <div className="text-muted small mt-1">
                {formatDateTime(status.lastSyncAt)}
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success mb-0">
            <i className="fas fa-check-circle me-2" />
            {successMessage}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger mb-0">
            <i className="fas fa-exclamation-triangle me-2" />
            {error}
          </div>
        )}

        {/* Sync Action */}
        <button
          className="btn btn-primary w-100"
          onClick={handleSync}
          disabled={syncing || !status.online || !isAuthenticated}
        >
          {syncing ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Syncing...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt me-2" />
              Sync Now
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
