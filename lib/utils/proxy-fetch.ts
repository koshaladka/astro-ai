import { fetch as undiciFetch, ProxyAgent } from "undici";

// Возвращает URL корпоративного прокси из переменных окружения
function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    null
  );
}

// Выполняет HTTP-запрос с учётом корпоративного прокси, если он задан
export async function proxyFetch(url: string, init?: RequestInit) {
  const proxy = getProxyUrl();
  if (!proxy) {
    return fetch(url, init);
  }

  const dispatcher = new ProxyAgent(proxy);
  return undiciFetch(url, { ...init, dispatcher });
}
