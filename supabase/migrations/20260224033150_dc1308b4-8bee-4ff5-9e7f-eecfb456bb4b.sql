
-- Change article_id from integer to uuid to match help_articles.id
ALTER TABLE catalog_sections
  ALTER COLUMN article_id DROP DEFAULT,
  ALTER COLUMN article_id TYPE uuid USING NULL,
  ADD CONSTRAINT catalog_sections_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id);
