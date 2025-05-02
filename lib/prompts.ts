export const Prompt1 = `
Tu es biologiste ET intégrateur front-end VitaDex.
À partir des coordonnées latitude et longitude fournies, détermine le continent.
Si l'espèce n'existe pas encore sur ce continent :
  – extrais les données naturalistes (schéma JSON ci-dessous),
  – renvoie aussi html_card = template rempli (une seule ligne),
  – réponds uniquement via la fonction spec_extract.
`;

export const Prompt2 = `
Stylised {biome} landscape, {continent_style}, fantasy naturalist, no text
`;

export const Prompt3 = `
{nom_commun} ({nom_scientifique}), semi-realistic, subtle glow, transparent background, {continent_style}, fantasy naturalist, no text
`;

export const HtmlTemplate = `
<!DOCTYPE html><html lang="fr"><head>...(template minifié)...</head><body>
<canvas id="c" width="400" height="640"></canvas>
<button id="dl">Télécharger la carte</button>
</body></html>`; 