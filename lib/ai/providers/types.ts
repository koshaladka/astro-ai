export type AiMessage = { role: string; content: string };

export interface AiProvider {
  chat(messages: AiMessage[]): Promise<string>;
  readonly name: string;
  readonly model: string;
}
