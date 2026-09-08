CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_generations_device_date ON generations(device_hash, created_at);

CREATE TABLE IF NOT EXISTS usage_daily (
  device_hash TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  generation_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(device_hash, usage_date)
);

CREATE TABLE IF NOT EXISTS usage_feature_daily (
  device_hash TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  feature TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(device_hash, usage_date, feature)
);
