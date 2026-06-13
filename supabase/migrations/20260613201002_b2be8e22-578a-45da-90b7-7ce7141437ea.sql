CREATE TABLE public.saved_listings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_listings TO authenticated;
GRANT ALL ON public.saved_listings TO service_role;

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their saved listings"
  ON public.saved_listings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_listings_user ON public.saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing ON public.saved_listings(listing_id);