CREATE TABLE IF NOT EXISTS site_viewer (
    viewer_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
    language_key TEXT DEFAULT 'en',
    viewer_passWord TEXT,
    viewer_userID TEXT,
    viewer_isActive INTEGER DEFAULT 0,
    viewer_lastLogin TEXT DEFAULT NULL,
    viewer_globalUserID TEXT
);

CREATE TABLE IF NOT EXISTS nextsteps_contact (
    contact_uuid TEXT PRIMARY KEY UNIQUE,
    contact_recordId INTEGER,
    contact_firstName TEXT DEFAULT '',
    contact_lastName TEXT DEFAULT '',
    contact_nickname TEXT DEFAULT '',
    campus_uuid TEXT DEFAULT NULL REFERENCES nextsteps_campus_data(campus_uuid) ON DELETE SET DEFAULT,
    year_id INTEGER NOT NULL DEFAULT 1,
    contact_phone TEXT,
    contact_email TEXT,
    contact_notes TEXT
);

CREATE TABLE IF NOT EXISTS nextsteps_group (
    group_uuid TEXT PRIMARY KEY UNIQUE,
    group_name TEXT NOT NULL,
    group_filter TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nextsteps_campus_data (
    campus_uuid TEXT PRIMARY KEY UNIQUE
);
CREATE TABLE IF NOT EXISTS nextsteps_campus_trans (
    trans_uuid TEXT PRIMARY KEY UNIQUE,
    campus_uuid TEXT NOT NULL REFERENCES nextsteps_campus_data(campus_uuid) ON DELETE CASCADE,
    language_code TEXT NOT NULL DEFAULT '',
    campus_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nextsteps_year_data (
    year_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE
);
CREATE TABLE IF NOT EXISTS nextsteps_year_trans (
    trans_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
    year_id INTEGER NOT NULL DEFAULT 1,
    language_code TEXT NOT NULL DEFAULT '',
    year_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nextsteps_tag_data (
    tag_uuid TEXT PRIMARY KEY UNIQUE
);
CREATE TABLE IF NOT EXISTS nextsteps_tag_trans (
    trans_uuid TEXT PRIMARY KEY UNIQUE,
    tag_uuid TEXT NOT NULL REFERENCES nextsteps_tag_data(tag_uuid) ON DELETE CASCADE,
    language_code TEXT NOT NULL DEFAULT '',
    tag_label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nextsteps_contact_tag (
    contacttag_uuid TEXT PRIMARY KEY UNIQUE,
    contact_uuid TEXT NOT NULL REFERENCES nextsteps_contact(contact_uuid) ON DELETE CASCADE,
    tag_uuid TEXT NOT NULL REFERENCES nextsteps_tag_data(tag_uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nextsteps_step_data (
    step_uuid TEXT PRIMARY KEY UNIQUE,
    campus_uuid TEXT DEFAULT NULL REFERENCES nextsteps_campus_data(campus_uuid) DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS nextsteps_step_trans (
    trans_uuid TEXT PRIMARY KEY UNIQUE,
    step_uuid TEXT NOT NULL REFERENCES nextsteps_step_data(step_uuid) ON DELETE CASCADE,
    language_code TEXT NOT NULL DEFAULT '',
    step_label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nextsteps_contact_step (
    contactstep_uuid TEXT PRIMARY KEY UNIQUE,
    contact_uuid TEXT NOT NULL REFERENCES nextsteps_contact(contact_uuid) ON DELETE CASCADE,
    step_uuid TEXT NOT NULL REFERENCES nextsteps_step_data(step_uuid) ON DELETE CASCADE,
    step_date TEXT DEFAULT NULL,
    step_location TEXT DEFAULT NULL
);