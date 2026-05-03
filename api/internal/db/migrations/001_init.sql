CREATE TABLE IF NOT EXISTS items (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title        TEXT NOT NULL DEFAULT '',
    slug         TEXT NOT NULL UNIQUE,
    brand        TEXT NOT NULL DEFAULT '',
    category     TEXT NOT NULL DEFAULT '',
    condition    TEXT NOT NULL DEFAULT '',
    type         TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'In Stock',
    post_status  TEXT NOT NULL DEFAULT 'Draft',
    quantity     INTEGER NOT NULL DEFAULT 1,
    featured     INTEGER NOT NULL DEFAULT 0,
    price        REAL,
    dim_width    REAL,
    dim_depth    REAL,
    dim_height   REAL,
    dim_weight   REAL,
    item_date    TEXT,
    images       TEXT NOT NULL DEFAULT '[]',
    tags         TEXT NOT NULL DEFAULT '[]',
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_items_slug        ON items(slug);
CREATE INDEX IF NOT EXISTS idx_items_status      ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_post_status ON items(post_status);
CREATE INDEX IF NOT EXISTS idx_items_featured    ON items(featured);
CREATE INDEX IF NOT EXISTS idx_items_updated_at  ON items(updated_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    feedback   TEXT NOT NULL DEFAULT '',
    type       TEXT NOT NULL DEFAULT 'Product Review',
    name       TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_status     ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

PRAGMA journal_mode=WAL;
