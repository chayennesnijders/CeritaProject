-- The shop no longer sells journals (printable pdf's): digital goods would need Apple/Google in-app payments.
UPDATE public.shop_products SET is_active = false WHERE category = 'journals' OR kind = 'digitaal';
