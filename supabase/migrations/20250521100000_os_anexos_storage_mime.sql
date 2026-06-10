-- Bucket os-anexos: MIME comuns em celular (HEIC/JPEG) e limite 8 MB

update storage.buckets
set
  file_size_limit = 8388608,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif'
  ]
where id = 'os-anexos';
