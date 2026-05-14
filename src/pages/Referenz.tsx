import { useParams } from 'react-router-dom';
import PagePlaceholder from './_PagePlaceholder';

export default function Referenz() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PagePlaceholder
      title="Case-Study | KALKU"
      description="Anonymisierte Bauunternehmer-Case mit Vorher/Nachher-Zahlen."
      path={`/referenzen/${slug ?? ''}/`}
      eyebrow="Case-Study"
      h1="Case-Detail"
      intro="Diese Tiefenseite folgt in Phase 3.3."
    />
  );
}
