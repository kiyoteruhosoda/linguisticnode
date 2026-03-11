import { createSpeechApplicationService } from "../../../../src/core/speech/speechApplicationService";
import { mobileSpeechGateway } from "../infra/mobileSpeechGateway";

export const mobileSpeechService = createSpeechApplicationService(mobileSpeechGateway);
