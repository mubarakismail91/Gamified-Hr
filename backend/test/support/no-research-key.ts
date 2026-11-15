// Imported FIRST by research-disabled.e2e-spec.ts: settings are read once when the app module loads,
// so the key has to be cleared before that. Empty (not deleted) so backend/.env can't fill it back in.
process.env.RESEARCH_KEY = '';
