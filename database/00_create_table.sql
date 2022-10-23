-- Table: public.power_files_history

-- DROP TABLE IF EXISTS public.power_files_history;

CREATE TABLE IF NOT EXISTS public.power_files_history
(
    name character varying COLLATE pg_catalog."default" NOT NULL,
    content character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT power_files_history_pkey PRIMARY KEY (name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.power_files_history
    OWNER to lumen;

-- Table: public.power_history_daily

-- DROP TABLE IF EXISTS public.power_history_daily;

CREATE TABLE IF NOT EXISTS public.power_history_daily
(
    date timestamp without time zone NOT NULL,
    value integer NOT NULL,
    source character varying COLLATE pg_catalog."default" NOT NULL,
    type character varying COLLATE pg_catalog."default" NOT NULL,
    ip character varying COLLATE pg_catalog."default",
    CONSTRAINT power_history_daily_pkey PRIMARY KEY (date, source),
    CONSTRAINT power_history_daily_source_fkey FOREIGN KEY (source)
        REFERENCES public.power_files_history (name) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.power_history_daily
    OWNER to lumen;

-- Table: public.power_history_hourly

-- DROP TABLE IF EXISTS public.power_history_hourly;

CREATE TABLE IF NOT EXISTS public.power_history_hourly
(
    date timestamp without time zone NOT NULL,
    value integer NOT NULL,
    source character varying COLLATE pg_catalog."default" NOT NULL,
    type character varying COLLATE pg_catalog."default" NOT NULL,
    ip character varying COLLATE pg_catalog."default",
    CONSTRAINT power_history_hourly_pkey PRIMARY KEY (date, source),
    CONSTRAINT power_history_hourly_source_fkey FOREIGN KEY (source)
        REFERENCES public.power_files_history (name) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.power_history_hourly
    OWNER to lumen;

-- Table: public.power_history_monthly

-- DROP TABLE IF EXISTS public.power_history_monthly;

CREATE TABLE IF NOT EXISTS public.power_history_monthly
(
    date timestamp without time zone NOT NULL,
    value integer NOT NULL,
    source character varying COLLATE pg_catalog."default" NOT NULL,
    type character varying COLLATE pg_catalog."default" NOT NULL,
    ip character varying COLLATE pg_catalog."default",
    CONSTRAINT power_history_monthly_pkey PRIMARY KEY (date, source),
    CONSTRAINT power_history_monthly_source_fkey FOREIGN KEY (source)
        REFERENCES public.power_files_history (name) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.power_history_monthly
    OWNER to lumen;