import { useParams } from 'react-router-dom';
import PagePlaceholder from './_PagePlaceholder';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PagePlaceholder
      title="Blog-Artikel | KALKU"
      description="Pain-driven Wissen für Bauunternehmer."
      path={`/blog/${slug ?? ''}/`}
      eyebrow="Blog-Artikel"
      h1="Blog-Artikel"
      intro="Diese Seite folgt in Phase 3.3."
    />
  );
}
