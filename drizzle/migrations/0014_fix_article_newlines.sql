UPDATE public.articles SET body = replace(body, '\n\n', E'\n\n');
UPDATE public.articles SET body = replace(body, '\n', E'\n');
UPDATE public.articles SET body = replace(body, '\n\n', E'\n\n');