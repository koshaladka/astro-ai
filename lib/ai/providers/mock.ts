import type { AiProvider } from "./types";

// Возвращает фиксированные ответы для тестов и MVP
export function createMockProvider(): AiProvider {
  return {
    name: "mock",
    model: "mock-v1",
    async chat(messages) {
      const last = messages.at(-1)?.content ?? "";
      if (last.includes("JSON для Free Astrology API")) {
        return JSON.stringify({
          year: 1984,
          month: 4,
          date: 20,
          hours: 11,
          minutes: 30,
          seconds: 0,
          latitude: 55.67719,
          longitude: 37.89322,
          timezone: 4,
          config: {
            observation_point: "geocentric",
            ayanamsha: "tropical",
            house_system: "Placidus",
            language: "ru",
          },
        });
      }

      return `Ваша натальная карта сочетает устойчивость Тельца в Солнце с эмоциональной широтой Луны в Стрельце. Асцендент в Раке добавляет чуткость и ориентацию на близких людей.

Сильные стороны — практичность, терпение и способность глубоко чувствовать ситуацию. Вы умеете сочетать надёжность с интересом к новому опыту.

Зоны внимания — не застревать в привычных реакциях и давать себе время на отдых. Марс в Скорпионе усиливает внутреннюю решительность, но важно направлять её конструктивно.

В целом карта говорит о человеке, который ценит стабильность и одновременно тянется к смыслу и росту.`;
    },
  };
}
