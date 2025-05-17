export const Prompt1 = `
Tu es biologiste et intégrateur front-end pour VitaDex.
À partir des coordonnées latitude et longitude fournies, détermine le continent.
Si l'espèce n'existe pas encore dans la base :
  – renvoie un JSON pour \`spec_extract\` avec les champs :
    nom_commun, nom_scientifique,
    categorie (Mammifère|Oiseau|Reptile|Amphibien|Poisson|Insecte|Arachnide|Mollusque|Crustacé|Plante|Champignon),
    biome (Forêt|Savane/Prairie|Désert|Montagne/Rocheux|Eau douce|Milieu marin|Souterrain/Caverne|Urbain|Toundra/Polaire),
    traits (4 valeurs libres),
    taille_moyenne,
    esperance_vie,
    description_professionnelle,
    niveau_de_rarete (Commune|Peu commune|Rare|Légendaire),
    continent,
    html_card.
  – la réponse doit uniquement invoquer la fonction \`spec_extract\`.
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