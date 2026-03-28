CREATE TABLE IF NOT EXISTS rate_limits (
  ip           TEXT        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 1,
  window_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (ip, window_date)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;