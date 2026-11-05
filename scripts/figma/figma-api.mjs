const FIGMA_API_BASE = 'https://api.figma.com';

/**
 * @param {string} token
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function figmaGetJson(token, path) {
  if (!token) {
    throw new Error('Missing FIGMA_TOKEN env var');
  }

  const url = `${FIGMA_API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Figma-Token': token,
      'Accept': 'application/json'
    }
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message = (json && (json.message || json.err || json.error)) || res.statusText;
    const hint =
      res.status === 403
        ? ' (If this is a variables endpoint, make sure your token has file_variables:read scope and your Figma plan/account supports it.)'
        : '';
    throw new Error(`Figma API ${res.status} ${message}${hint}`);
  }

  return json;
}

/**
 * Variables (local) include:
 * - variables created in the file (even if unused)
 * - remote/subscribed variables that are used in the file
 *
 * @param {string} token
 * @param {string} fileKey
 */
export async function getLocalVariables(token, fileKey) {
  return figmaGetJson(token, `/v1/files/${encodeURIComponent(fileKey)}/variables/local`);
}

/**
 * Published variables are what the file publishes as a library.
 * NOTE: This endpoint omits mode values; local variables endpoint is still needed for modes.
 *
 * @param {string} token
 * @param {string} fileKey
 */
export async function getPublishedVariables(token, fileKey) {
  return figmaGetJson(token, `/v1/files/${encodeURIComponent(fileKey)}/variables/published`);
}

