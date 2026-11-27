-- Update na update-75: de verzonnen voorbeeldverhalen uit de allereerste testdata weghalen.
-- Ze stonden als 'artikel' in Ontdekken, maar het zijn verzonnen ik-verhalen, geen artikelen en geen echte verhalen.
-- Het echte artikel 'Hoe begin je een gesprek met iemand die je niet kent?' blijft staan.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.
DELETE FROM public.articles
WHERE title IN (
  'De dag dat ik voor het eerst alleen op school kwam',
  'Een avond zonder telefoon',
  'Verhuizen: wat niemand je vertelt'
)
AND (body LIKE 'Mijn eerste dag op de nieuwe school%'
  OR body LIKE 'We probeerden het met z''n drieen%'
  OR body LIKE 'Iedereen zegt dat verhuizen spannend is%');
