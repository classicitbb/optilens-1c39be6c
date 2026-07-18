-- The catalog reads supplies through the brand and supplier foreign-key
-- relationships. Refresh PostgREST after deployment so those relationships
-- are immediately available to the REST schema cache.
NOTIFY pgrst, 'reload schema';
