// Small, fail-closed assertions shared by the live staging write verifier and unit tests.
export function assertRlsDenial(response, label) {
  if (response?.error?.code === "42501" && (response.data === null || response.data === undefined)) return;
  if (response?.error) {
    throw Error(label + ": expected PostgreSQL RLS denial 42501; received " + (response.error.code ?? "unknown"));
  }
  if (response?.data) throw Error(label + ": RLS BYPASS; mutation returned a row");
  throw Error(label + ": inconclusive; no explicit RLS denial was returned");
}

export function assertNoVisibleMutation(response, label) {
  if (response?.error) {
    throw Error(label + ": Data API request failed (code " + (response.error.code ?? "unknown") + ")");
  }
  const data = response?.data;
  if (data !== null && data !== undefined && !(Array.isArray(data) && data.length === 0)) {
    throw Error(label + ": RLS BYPASS; a row was returned");
  }
}

export function assertSingleRow(response, label) {
  if (response?.error) {
    throw Error(label + ": expected one row; Data API returned code " + (response.error.code ?? "unknown"));
  }
  if (!response?.data || Array.isArray(response.data)) {
    throw Error(label + ": expected exactly one returned row");
  }
}
