#!/bin/bash
# Gera landing/index.html (standalone, pronto para deploy) a partir de _page.html.
# _page.html é a fonte única: <title> + <style> ... e depois o conteúdo do body.
set -euo pipefail
cd "$(dirname "$0")"

SRC="_page.html"
OUT="index.html"

# Divide a fonte no fechamento do bloco <style>
HEAD_PART=$(awk '{print} /^<\/style>$/{exit}' "$SRC")
BODY_PART=$(awk 'f{print} /^<\/style>$/{f=1}' "$SRC")

cat > "$OUT" <<HTML
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1118" media="(prefers-color-scheme: dark)">

<meta name="description" content="Babás com antecedentes criminais verificados no Rio de Janeiro. Fale direto, sem agência e sem comissão. R\$ 14,90/mês para famílias, R\$ 29,90/mês para babás. 7 dias grátis.">
<link rel="canonical" href="https://donababy.com/">

<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Dona Baby+">
<meta property="og:url" content="https://donababy.com/">
<meta property="og:title" content="Dona Baby+ — a babá certa, checada antes de entrar na sua casa">
<meta property="og:description" content="100% das babás com antecedentes criminais verificados. R\$ 14,90/mês para famílias. 7 dias grátis, cancele quando quiser.">
<meta property="og:image" content="https://donababy.com/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">

<!-- Smart App Banner iOS: trocar 000000000 pelo Apple ID do app -->
<meta name="apple-itunes-app" content="app-id=000000000">

<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "name": "Dona Baby+",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "iOS 15+, Android 8+",
  "url": "https://donababy.com/",
  "areaServed": { "@type": "City", "name": "Rio de Janeiro" },
  "description": "Plataforma que conecta babás verificadas e famílias no Rio de Janeiro, sem agência e sem comissão.",
  "offers": [
    { "@type": "Offer", "name": "Plano Famílias", "price": "14.90", "priceCurrency": "BRL",
      "description": "Mensalidade para famílias. 7 dias grátis." },
    { "@type": "Offer", "name": "Plano Babás", "price": "29.90", "priceCurrency": "BRL",
      "description": "Mensalidade para babás e cuidadoras. 7 dias grátis." }
  ]
}
</script>

$HEAD_PART
</head>
<body>
$BODY_PART
</body>
</html>
HTML

echo "✓ $OUT gerado ($(wc -c < "$OUT" | tr -d ' ') bytes)"
