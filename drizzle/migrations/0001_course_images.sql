ALTER TABLE public.courses ADD COLUMN image_url text;
CREATE POLICY "course images public read" ON storage.objects FOR SELECT USING (bucket_id = 'course-images');
CREATE POLICY "course images admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "course images admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));