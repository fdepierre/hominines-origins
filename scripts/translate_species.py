#!/usr/bin/env python3
"""
Transforme app/data/species.json pour rendre tous les champs textuels FR bilingues FR/EN.

Règles :
- Les champs déjà au format {fr, en} sont conservés.
- Les champs textuels listés dans I18N_STRING_FIELDS deviennent {fr, en}.
- Les tableaux de strings (hominin:tools) deviennent des tableaux de {fr, en}.
- Pour regions / fossilSites, on convertit `name` et `note` en {fr, en}.
- Pour migrations, `label` devient {fr, en}.
- Le champ racine `description` devient {fr, en}.

Les traductions EN sont un mapping explicite basé sur la référence scientifique
(Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md) et la terminologie
paléoanthropologique anglaise standard.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_PATH = ROOT / "app" / "data" / "species.json"
OUT_PATH = SPECIES_PATH  # overwrite

# -------- TRANSLATION DICTIONARIES --------------------------------------------

# Root-level description
ROOT_DESCRIPTION_EN = (
    "Catalogue of hominin species from 4.1 Ma to 2,000 years BP, based on recent "
    "palaeoanthropological publications (2022-2026)."
)

# dimorphism
DIMORPHISM = {
    "Très marqué (~40%)": "Strongly marked (~40%)",
    "Marqué": "Marked",
    "Modéré": "Moderate",
    "Faible": "Low",
    "Faible à modéré": "Low to moderate",
    "Inconnu": "Unknown",
}

# biometrics strings (contain French-style spaces and unit formatting)
BIOMETRIC_NUMERIC = {
    # heights
    "~150 cm": "~150 cm",
    "~105 cm": "~105 cm",
    "~130–135 cm": "~130–135 cm",
    "~100–120 cm": "~100–120 cm",
    "145–185 cm": "145–185 cm",
    "130–160 cm": "130–160 cm",
    "~175 cm (jusqu'à 181)": "~175 cm (up to 181)",
    "~157 cm": "~157 cm",
    "~164 cm (148–177)": "~164 cm (148–177)",
    "~155 cm": "~155 cm",
    "> 180 cm (estimé)": "> 180 cm (estimated)",
    "Non documenté": "Not documented",
    "~185 cm": "~185 cm",
    "~170 cm": "~170 cm",
    "~170–185 cm": "~170–185 cm",
    "~158–168 cm": "~158–168 cm",
    "~167–172 cm": "~167–172 cm",
    "~155–163 cm": "~155–163 cm",
    "~163–168 cm (légère réduction)": "~163–168 cm (slight reduction)",
    "~152–158 cm": "~152–158 cm",
    "~168–175 cm": "~168–175 cm",
    "~156–163 cm": "~156–163 cm",
    "~145 cm": "~145 cm",
    "~140 cm": "~140 cm",
    "~106 cm": "~106 cm",
    "~100 cm": "~100 cm",
    # weights
    "~42 kg": "~42 kg",
    "~37 kg": "~37 kg",
    "40–68 kg": "40–68 kg",
    "~62 kg": "~62 kg",
    "~65 kg": "~65 kg",
    "~100 kg (estimé)": "~100 kg (estimated)",
    "~70 kg": "~70 kg",
    "~60–65 kg": "~60–65 kg",
    "~65–70 kg": "~65–70 kg",
    "~45 kg": "~45 kg",
    "~30 kg": "~30 kg",
    # brain volumes
    "385–550 cm³": "385–550 cm³",
    "500–900 cm³": "500–900 cm³",
    "600–1 100 cm³ (moy. ~900)": "600–1,100 cm³ (avg. ~900)",
    "1 100–1 400 cm³": "1,100–1,400 cm³",
    "1 200–1 750 cm³": "1,200–1,750 cm³",
    "≥ H. sapiens (estimé)": "≥ H. sapiens (estimated)",
    "1 200–1 600 cm³": "1,200–1,600 cm³",
    "~1 450–1 550 cm³": "~1,450–1,550 cm³",
    "~1 350–1 500 cm³": "~1,350–1,500 cm³",
    "~1 400 cm³": "~1,400 cm³",
    "465–610 cm³": "465–610 cm³",
    "~380–430 cm³": "~380–430 cm³",
}

# pigmentationCertLabel
PIGM_CERT_LABEL = {
    "⚠️ Inférence évolutive": "⚠️ Evolutionary inference",
    "⚠️ Inférence évolutive (pas d'ADN)": "⚠️ Evolutionary inference (no DNA)",
    "🔬 MC1R sweep génétique (~1,2 Ma)": "🔬 MC1R genetic sweep (~1.2 Ma)",
    "✅ ADN direct (MC1R + génomes complets)": "✅ Direct DNA (MC1R + full genomes)",
    "✅ ADN ancien direct (Denisova 3)": "✅ Direct ancient DNA (Denisova 3)",
    "✅ ADN africain ancien (Nature 2025)": "✅ Ancient African DNA (Nature 2025)",
    "⚠️ Inférence par continuité génomique": "⚠️ Inference from genomic continuity",
    "✅ ADN direct — 348 génomes (PNAS 2025)": "✅ Direct DNA — 348 genomes (PNAS 2025)",
    "✅ ADN direct — \"Paradoxe pigmentaire\" documenté": "✅ Direct DNA — \"Pigmentation paradox\" documented",
    "✅ ADN direct (Ötzi + nombreux génomes)": "✅ Direct DNA (Ötzi + many genomes)",
    "✅ ADN ancien + génomique moderne (PNAS 2025)": "✅ Ancient DNA + modern genomics (PNAS 2025)",
}

# tools (each tool is a string — we map each exact FR string)
TOOLS = {
    "Aucun outil connu": "No known tools",
    "Comportement proche des grands singes": "Behaviour similar to great apes",
    "Bipédie régulière": "Habitual bipedalism",
    "Industrie Oldowayen": "Oldowan industry",
    "Galets taillés (choppers)": "Knapped pebbles (choppers)",
    "Outils sur éclats": "Flake tools",
    "Industrie Acheuléenne": "Acheulean industry",
    "Bifaces en amande": "Almond-shaped handaxes",
    "Usage du feu (probable)": "Fire use (probable)",
    "Outils sur éclats Levallois (tardif)": "Levallois flake tools (late)",
    "Acheuléen avancé": "Advanced Acheulean",
    "Bifaces façonnés": "Shaped handaxes",
    "Premières sépultures (Sima de los Huesos)": "Earliest burials (Sima de los Huesos)",
    "Débitage discoïde": "Discoidal core reduction",
    "Industrie Moustérienne": "Mousterian industry",
    "Débitage Levallois": "Levallois reduction",
    "Industrie Châtelperronienne (tardif)": "Châtelperronian industry (late)",
    "Bijoux, ocre, sépultures rituelles": "Ornaments, ochre, ritual burials",
    "Industrie intermédiaire (Altaï)": "Intermediate industry (Altai)",
    "Bracelet en chloritolite (Denisova)": "Chlorite bracelet (Denisova)",
    "Parures et ornements": "Ornaments and personal adornments",
    "Industrie MSA (Middle Stone Age)": "MSA industry (Middle Stone Age)",
    "Pointes foliacées": "Foliate points",
    "Perles en coquillage": "Shell beads",
    "Art rupestre précoce": "Early rock art",
    "Pêche, piégeage": "Fishing, trapping",
    "MSA / Early IUP": "MSA / Early IUP",
    "Ocre utilisée": "Ochre use",
    "Sépultures rituelles": "Ritual burials",
    "Perles et parures": "Beads and ornaments",
    "Industrie Aurignacienne": "Aurignacian industry",
    "Industrie Gravettienne": "Gravettian industry",
    "Sagaies en os": "Bone spearpoints",
    "Art pariétal (Lascaux, Altamira, Chauvet)": "Cave art (Lascaux, Altamira, Chauvet)",
    "Statuettes Vénus": "Venus figurines",
    "Parures élaborées": "Elaborate personal adornments",
    "Industrie Mésolithique": "Mesolithic industry",
    "Microlithes géométriques": "Geometric microliths",
    "Arc et flèches perfectionnés": "Refined bow and arrow",
    "Pirogues": "Dugout canoes",
    "Pêche intensive": "Intensive fishing",
    "Agriculture (blé, orge, légumineuses)": "Agriculture (wheat, barley, legumes)",
    "Élevage (bovins, ovins, porcins)": "Animal husbandry (cattle, sheep, pigs)",
    "Poterie": "Pottery",
    "Mégalithes (Stonehenge)": "Megaliths (Stonehenge)",
    "Polissage de la pierre": "Stone polishing",
    "Tissage": "Weaving",
    "Métallurgie bronze puis fer": "Bronze then iron metallurgy",
    "Chars de combat": "War chariots",
    "Écriture (cunéiforme, hiéroglyphes)": "Writing (cuneiform, hieroglyphs)",
    "Navigation avancée": "Advanced navigation",
    "Commerce longue distance": "Long-distance trade",
    "Outils non attribués avec certitude": "Tools not confidently attributed",
    "Mains adaptées à la préhension fine": "Hands adapted to fine manipulation",
    "Bipédie efficace avec capacités grimpeuses": "Efficient bipedalism with climbing abilities",
    "Outils lithiques simples": "Simple lithic tools",
    "Faune insulaire chassée ou charognée": "Island fauna hunted or scavenged",
    "Adaptation probable au nanisme insulaire": "Probable adaptation to insular dwarfism",
}

# debates (longer strings — each is a unique key)
DEBATE = {
    "Bipédie vs arboricolarité (Lovejoy vs Stern & Susman) ; date et modalités de perte du pelage discutées.":
        "Bipedalism vs arboreality (Lovejoy vs Stern & Susman); date and mode of body-hair loss still discussed.",
    "Statut d'espèce cohérente débattu (Wood & Collard 1999). Probablement un groupement de plusieurs espèces.":
        "Coherence as a single species debated (Wood & Collard 1999). Probably a grouping of several species.",
    "H. erectus sensu lato est probablement un groupement polyphylétique (Rogers et al. 2020) ; variations régionales importantes.":
        "H. erectus sensu lato is probably a polyphyletic grouping (Rogers et al. 2020); marked regional variation.",
    "Statut d'espèce très débattu. Certains chercheurs le séparent en H. antecessor (Europe) et gardent H. heidelbergensis pour l'Afrique.":
        "Species status strongly debated. Some researchers split it into H. antecessor (Europe) and retain H. heidelbergensis for Africa.",
    "Hawks (2023) : limites méthodologiques de l'inférence phénotypique. Introgression de pigmentation Néandertal → H. sapiens (Iasi et al., Science 2024). Extinction : compétition avec H. sapiens vs absorption génétique.":
        "Hawks (2023): methodological limits of phenotype inference. Neanderthal → H. sapiens pigmentation introgression (Iasi et al., Science 2024). Extinction: competition with H. sapiens vs genetic absorption.",
    "Identification Dragon Man = Dénisovien confirmée par protéomique + ADNmt (Fu Qiaomei et al., 2025). ADN nucléaire pas encore disponible — certains paléoanthropologues attendent confirmation définitive.":
        "Dragon Man = Denisovan identification confirmed by proteomics + mtDNA (Fu Qiaomei et al., 2025). Nuclear DNA not yet available — some palaeoanthropologists await definitive confirmation.",
    "Débat \"pan-africain\" vs origine unique Est-africaine. Jebel Irhoud plaide pour une évolution sur l'ensemble du continent.":
        "\"Pan-African\" debate vs single East-African origin. Jebel Irhoud supports evolution across the whole continent.",
    "Cette 1ère sortie (~130 ka) ne semble pas avoir contribué au peuplement mondial. La grande dispersion vient d'une vague ultérieure (~60–70 ka).":
        "This first Out-of-Africa (~130 ka) does not appear to have contributed to the global population. The main dispersal came with a later wave (~60–70 ka).",
    "Découplage yeux/peau : les yeux clairs précèdent la peau claire de plusieurs millénaires. Mécanisme sélectif non élucidé (sélection sexuelle ? dérive ? pléiotropie ?).":
        "Eye/skin decoupling: light eyes precede light skin by several millennia. Selective mechanism still unexplained (sexual selection? drift? pleiotropy?).",
    "Paradoxe peau sombre + yeux clairs : combinaison directement attestée par ADN. Le mécanisme de sélection des yeux clairs avant la peau est toujours inexpliqué.":
        "Dark skin + light eyes paradox: combination directly confirmed by DNA. The mechanism selecting light eyes before light skin remains unexplained.",
    "La réduction de taille est liée à la sédentarisation et aux déficiences alimentaires. Tri-hybridation WHG + EEF (agriculteurs anatoliens) + début apport Yamna.":
        "Stature reduction linked to sedentism and dietary deficiencies. Three-way admixture of WHG + EEF (Anatolian farmers) + early Yamnaya input.",
    "Ghirotto et al. (PNAS 2025) et Ju & Kelleher (PNAS 2021) s'accordent sur le caractère récent (~3 000 ans) de la peau claire mais divergent sur les rythmes de sélection vs dérive.":
        "Ghirotto et al. (PNAS 2025) and Ju & Kelleher (PNAS 2021) agree that light skin is recent (~3,000 years) but differ on the relative roles of selection vs drift.",
    "Débat fort sur le statut comportemental et phylogénétique : pratique funéraire, usage du feu et position dans Homo restent contestés ; plusieurs affirmations récentes ont été critiquées comme prématurées.":
        "Strong debate over behavioural and phylogenetic status: funerary practice, fire use and position within Homo remain contested; several recent claims have been criticised as premature.",
    "Le débat a opposé espèce distincte et pathologie de H. sapiens, mais l'interprétation comme espèce distincte domine aujourd'hui ; l'ascendance exacte (H. erectus insulaire ou lignée plus ancienne) reste discutée.":
        "Debate once opposed a distinct species to a pathology of H. sapiens, but the distinct-species interpretation now dominates; exact ancestry (insular H. erectus vs more basal lineage) is still discussed.",
}

# regions.name
REGION_NAMES = {
    "Afar (Éthiopie)": "Afar (Ethiopia)",
    "Laetoli (Tanzanie)": "Laetoli (Tanzania)",
    "Afrique de l'Est": "East Africa",
    "Afrique": "Africa",
    "Asie du Sud-Est": "Southeast Asia",
    "Eurasie": "Eurasia",
    "Europe occidentale": "Western Europe",
    "Europe": "Europe",
    "Proche-Orient": "Near East",
    "Asie centrale": "Central Asia",
    "Asie centrale/orientale": "Central/East Asia",
    "Altaï (Sibérie)": "Altai (Siberia)",
    "Levant / Proche-Orient": "Levant / Near East",
    "Australie": "Australia",
    "Amériques": "Americas",
    "Proche-Orient (Anatolie)": "Near East (Anatolia)",
    "Steppes pontiques": "Pontic steppes",
    "Afrique australe": "Southern Africa",
    "Île de Flores (Indonésie)": "Flores Island (Indonesia)",
}

# regions.note
REGION_NOTES = {
    "Hadar — \"Lucy\" AL 288-1, ~3,2 Ma": "Hadar — \"Lucy\" AL 288-1, ~3.2 Ma",
    "Empreintes de Laetoli, ~3,7 Ma": "Laetoli footprints, ~3.7 Ma",
    "Distribution générale": "General distribution",
    "Distribution principale": "Main distribution",
    "Origine et longue présence africaine": "Origin and long African presence",
    "Java, Chine — formes asiatiques robustes": "Java, China — robust Asian forms",
    "Dmanisi (Géorgie) — ~1,8 Ma": "Dmanisi (Georgia) — ~1.8 Ma",
    "Lignée vers H. sapiens": "Lineage leading to H. sapiens",
    "Lignée vers Néandertaliens": "Lineage leading to Neanderthals",
    "Centre principal de dispersion": "Main dispersal centre",
    "Coexistence avec H. sapiens": "Coexistence with H. sapiens",
    "Extension orientale": "Eastern extension",
    "Vaste distribution en Asie": "Wide Asian distribution",
    "Grotte de Denisova — fossiles originaux": "Denisova Cave — original fossils",
    "Berceau de H. sapiens": "Cradle of H. sapiens",
    "1ère présence hors Afrique": "First presence outside Africa",
    "Dispersion post-sortie d'Afrique": "Post Out-of-Africa dispersal",
    "Peuplement ~50 ka": "Peopling ~50 ka",
    "Via Béringie ~16–20 ka": "Via Beringia ~16–20 ka",
    "Chasseurs-cueilleurs WHG post-glaciaires": "Post-glacial WHG hunter-gatherers",
    "Agriculteurs anatoliens (EEF) + WHG": "Anatolian farmers (EEF) + WHG",
    "Berceau de l'agriculture — 10 ka": "Cradle of agriculture — 10 ka",
    "Peau claire généralisée en Europe du Nord": "Light skin widespread in Northern Europe",
    "Yamna / Cordé — migrants des steppes": "Yamnaya / Corded Ware — steppe migrants",
    "Rising Star Cave et environs": "Rising Star Cave and surroundings",
    "Distribution connue limitée à Flores": "Known distribution limited to Flores",
}

# fossilSites.name
SITE_NAMES = {
    "Hadar (Éthiopie)": "Hadar (Ethiopia)",
    "Laetoli (Tanzanie)": "Laetoli (Tanzania)",
    "Omo (Éthiopie)": "Omo (Ethiopia)",
    "Olduvai Gorge (Tanzanie)": "Olduvai Gorge (Tanzania)",
    "Koobi Fora (Kenya)": "Koobi Fora (Kenya)",
    "Turkana (Kenya)": "Turkana (Kenya)",
    "Dmanisi (Géorgie)": "Dmanisi (Georgia)",
    "Sangiran (Java)": "Sangiran (Java)",
    "Zhoukoudian (Chine)": "Zhoukoudian (China)",
    "Ndutu (Tanzanie)": "Ndutu (Tanzania)",
    "Kabwe (Zambie)": "Kabwe (Zambia)",
    "Casablanca (Maroc)": "Casablanca (Morocco)",
    "Mauer (Allemagne)": "Mauer (Germany)",
    "Bodo (Éthiopie)": "Bodo (Ethiopia)",
    "Atapuerca (Espagne)": "Atapuerca (Spain)",
    "Néander (Allemagne)": "Neander (Germany)",
    "El Sidrón (Espagne)": "El Sidrón (Spain)",
    "Shanidar (Irak)": "Shanidar (Iraq)",
    "La Chapelle (France)": "La Chapelle (France)",
    "Vindija (Croatie)": "Vindija (Croatia)",
    "Teshik-Tash (Ouzbékistan)": "Teshik-Tash (Uzbekistan)",
    "Denisova (Sibérie)": "Denisova (Siberia)",
    "Harbin (Chine)": "Harbin (China)",
    "Xiahe (Tibet)": "Xiahe (Tibet)",
    "Penghu (Taiwan)": "Penghu (Taiwan)",
    "Jebel Irhoud (Maroc)": "Jebel Irhoud (Morocco)",
    "Omo Kibish (Éthiopie)": "Omo Kibish (Ethiopia)",
    "Herto (Éthiopie)": "Herto (Ethiopia)",
    "Florisbad (Afrique du Sud)": "Florisbad (South Africa)",
    "Skhul (Israël)": "Skhul (Israel)",
    "Qafzeh (Israël)": "Qafzeh (Israel)",
    "Tinshemet (Israël)": "Tinshemet (Israel)",
    "Ust'-Ishim (Sibérie)": "Ust'-Ishim (Siberia)",
    "Lascaux (France)": "Lascaux (France)",
    "Altamira (Espagne)": "Altamira (Spain)",
    "Dolní Věstonice (Tchéquie)": "Dolní Věstonice (Czechia)",
    "Sungir (Russie)": "Sungir (Russia)",
    "Mungo (Australie)": "Mungo (Australia)",
    "Cheddar (Grande-Bretagne)": "Cheddar (Great Britain)",
    "Skateholm (Suède)": "Skateholm (Sweden)",
    "Loschbour (Luxembourg)": "Loschbour (Luxembourg)",
    "La Braña (Espagne)": "La Braña (Spain)",
    "Ötzi (Alpes)": "Ötzi (Alps)",
    "Çatalhöyük (Turquie)": "Çatalhöyük (Turkey)",
    "Stonehenge (GB)": "Stonehenge (UK)",
    "Ötmarsum (Pays-Bas)": "Ootmarsum (Netherlands)",
    "Lolland (Danemark)": "Lolland (Denmark)",
    "Hallstatt (Autriche)": "Hallstatt (Austria)",
    "Rising Star Cave (Afrique du Sud)": "Rising Star Cave (South Africa)",
    "Lesedi Chamber (Afrique du Sud)": "Lesedi Chamber (South Africa)",
    "Liang Bua (Flores, Indonésie)": "Liang Bua (Flores, Indonesia)",
    "Mata Menge (Flores, Indonésie)": "Mata Menge (Flores, Indonesia)",
}

# fossilSites.note
SITE_NOTES = {
    "\"Lucy\" AL 288-1 — 3,2 Ma": "\"Lucy\" AL 288-1 — 3.2 Ma",
    "Empreintes de bipédie — 3,7 Ma": "Bipedal footprints — 3.7 Ma",
    "Nombreux fossiles, 2,8–3,9 Ma": "Numerous fossils, 2.8–3.9 Ma",
    "Site type — Industrie Oldowayen": "Type site — Oldowan industry",
    "Nombreux fossiles H. habilis": "Numerous H. habilis fossils",
    "Fossiles mixtes H. habilis / Au.": "Mixed H. habilis / Australopithecus fossils",
    "\"Turkana Boy\" KNM-WT 15000 — ~1,5 Ma": "\"Turkana Boy\" KNM-WT 15000 — ~1.5 Ma",
    "Plus ancien hors Afrique — 1,8 Ma": "Oldest outside Africa — 1.8 Ma",
    "H. erectus asiatique — 1,5 Ma": "Asian H. erectus — 1.5 Ma",
    "\"Homme de Pékin\" — 780–250 ka": "\"Peking Man\" — 780–250 ka",
    "Forme africaine tardive": "Late African form",
    "\"Crâne de Broken Hill\" — 299 ka": "\"Broken Hill skull\" — 299 ka",
    "Thomas Quarry I — ~773 ka": "Thomas Quarry I — ~773 ka",
    "Site type — mâchoire 600 ka": "Type site — 600 ka mandible",
    "Crâne africain 600 ka": "African skull 600 ka",
    "Sima de los Huesos — ~430 ka": "Sima de los Huesos — ~430 ka",
    "Site type — 1856, ~40 ka": "Type site — 1856, ~40 ka",
    "ADN MC1R — pigmentation documentée": "MC1R DNA — pigmentation documented",
    "Sépultures + fleurs — ~65 ka": "Burials + flowers — ~65 ka",
    "\"Vieillard\" — anatomie classique": "\"Old Man\" — classic anatomy",
    "Génomes complets séquencés — ~44 ka": "Full genomes sequenced — ~44 ka",
    "Extension orientale — ~70 ka": "Eastern extension — ~70 ka",
    "Grotte de Denisova — doigt + dents, ~60 ka": "Denisova Cave — finger + teeth, ~60 ka",
    "\"Dragon Man\" ~146 ka — identifié Dénisovien en 2025": "\"Dragon Man\" ~146 ka — identified as Denisovan in 2025",
    "Mâchoire Dénisovienne — ~160 ka, altitude 3280m": "Denisovan mandible — ~160 ka, altitude 3,280 m",
    "Mâchoire de Penghu — Dénisovien probable": "Penghu mandible — probable Denisovan",
    "Plus anciens H. sapiens — 315 ka": "Oldest H. sapiens — 315 ka",
    "Omo I et II — 195 ka": "Omo I and II — 195 ka",
    "Crânes modernes — 160 ka": "Modern skulls — 160 ka",
    "Fossile 259 ka — \"Homo helmei\"?": "259 ka fossil — \"Homo helmei\"?",
    "Sépultures — ~100–130 ka": "Burials — ~100–130 ka",
    "Sépultures avec parures — ~90–130 ka": "Burials with ornaments — ~90–130 ka",
    "5 sépultures H. sapiens — ~110 ka (2025)": "5 H. sapiens burials — ~110 ka (2025)",
    "Plus ancien génome H. sapiens non-africain — 45 ka": "Oldest non-African H. sapiens genome — 45 ka",
    "Peintures rupestres — ~17 ka": "Cave paintings — ~17 ka",
    "Peintures rupestres bisons — ~35 ka": "Bison cave paintings — ~35 ka",
    "Vénus paléolithique — ~26 ka": "Palaeolithic Venus — ~26 ka",
    "Sépulture parée de perles — ~34 ka": "Bead-adorned burial — ~34 ka",
    "Peuplement australien — ~42 ka": "Peopling of Australia — ~42 ka",
    "\"Cheddar Man\" — peau sombre + yeux bleus, ~9 ka": "\"Cheddar Man\" — dark skin + blue eyes, ~9 ka",
    "SF12 — peau sombre + yeux clairs, ~9 ka": "SF12 — dark skin + light eyes, ~9 ka",
    "WHG type — peau sombre + yeux bleus, ~8 ka": "WHG type — dark skin + blue eyes, ~8 ka",
    "Individu peau sombre + yeux bleus, ~7 ka": "Individual with dark skin + blue eyes, ~7 ka",
    "\"L'homme des glaces\" — peau sombre + cheveux noirs, ~5 300 ans": "\"The Iceman\" — dark skin + black hair, ~5,300 years",
    "Grande ville néolithique — ~7 500 ans": "Large Neolithic town — ~7,500 years",
    "Constructeurs peau intermédiaire — ~4 500 ans": "Builders with intermediate skin — ~4,500 years",
    "WHG tardif — peau claire émergente, ~3 500 ans": "Late WHG — emerging light skin, ~3,500 years",
    "Bronze Age — peau claire attestée, ~3 200 ans": "Bronze Age — light skin confirmed, ~3,200 years",
    "Civilisation du Fer — ~2 800 ans": "Iron Age civilisation — ~2,800 years",
    "Dinaledi Chamber — espèce décrite en 2015, datée ~335–236 ka": "Dinaledi Chamber — species described in 2015, dated ~335–236 ka",
    "Matériel supplémentaire attribué à H. naledi": "Additional material attributed to H. naledi",
    "LB1 et autres fossiles — ~100 à 50 ka": "LB1 and other fossils — ~100 to 50 ka",
    "Restes plus anciens attribués à des ancêtres de H. floresiensis — ~700 ka": "Older remains attributed to H. floresiensis ancestors — ~700 ka",
}

# migrations.label
MIGRATION_LABELS = {
    "Sortie d'Afrique ~1,8 Ma": "Out of Africa ~1.8 Ma",
    "Dispersion asiatique ~1,5 Ma": "Asian dispersal ~1.5 Ma",
    "Dispersion Chine ~0,78 Ma": "China dispersal ~0.78 Ma",
    "Dispersion vers l'Europe ~600 ka": "Dispersal into Europe ~600 ka",
    "Expansion vers Proche-Orient": "Expansion into the Near East",
    "Extension orientale ~70 ka": "Eastern extension ~70 ka",
    "Présence tibétaine (altitude)": "Tibetan presence (altitude)",
    "Dragon Man ~146 ka": "Dragon Man ~146 ka",
    "Sortie d'Afrique ~130 ka": "Out of Africa ~130 ka",
    "Grande sortie d'Afrique ~60–70 ka": "Main Out of Africa ~60–70 ka",
    "Peuplement Australie ~50 ka": "Peopling of Australia ~50 ka",
    "Béringie → Amériques ~16–20 ka": "Beringia → Americas ~16–20 ka",
    "Expansion agriculteurs anatoliens ~7 000 ans": "Anatolian farmer expansion ~7,000 years",
    "Migration Yamna → Europe ~5 000 ans": "Yamnaya → Europe migration ~5,000 years",
}


def is_i18n(v):
    return isinstance(v, dict) and ("fr" in v or "en" in v)


def tr_or_die(mapping, key, kind):
    if key in mapping:
        return mapping[key]
    raise KeyError(f"Missing EN translation for {kind}: {key!r}")


def translate_species(sp):
    # root-level name / descriptions stay as-is if already i18n
    out = dict(sp)

    # biometrics
    for fld in ("hominin:heightM", "hominin:heightF", "hominin:weightM", "hominin:brain"):
        v = out.get(fld)
        if isinstance(v, str):
            en = tr_or_die(BIOMETRIC_NUMERIC, v, fld)
            out[fld] = {"fr": v, "en": en}

    # dimorphism
    v = out.get("hominin:dimorphism")
    if isinstance(v, str):
        en = tr_or_die(DIMORPHISM, v, "dimorphism")
        out["hominin:dimorphism"] = {"fr": v, "en": en}

    # pigmentationCertLabel
    v = out.get("hominin:pigmentationCertLabel")
    if isinstance(v, str):
        en = tr_or_die(PIGM_CERT_LABEL, v, "pigmentationCertLabel")
        out["hominin:pigmentationCertLabel"] = {"fr": v, "en": en}

    # tools -> list of {fr,en}
    tools = out.get("hominin:tools")
    if isinstance(tools, list):
        new_tools = []
        for t in tools:
            if isinstance(t, str):
                en = tr_or_die(TOOLS, t, "tool")
                new_tools.append({"fr": t, "en": en})
            else:
                new_tools.append(t)
        out["hominin:tools"] = new_tools

    # debate
    v = out.get("hominin:debate")
    if isinstance(v, str):
        if not v:
            out["hominin:debate"] = {"fr": "", "en": ""}
        else:
            en = tr_or_die(DEBATE, v, "debate")
            out["hominin:debate"] = {"fr": v, "en": en}

    # regions
    regions = out.get("hominin:regions")
    if isinstance(regions, list):
        new_regions = []
        for r in regions:
            nr = dict(r)
            if isinstance(r.get("name"), str):
                nr["name"] = {"fr": r["name"], "en": tr_or_die(REGION_NAMES, r["name"], "region.name")}
            if isinstance(r.get("note"), str):
                nr["note"] = {"fr": r["note"], "en": tr_or_die(REGION_NOTES, r["note"], "region.note")}
            new_regions.append(nr)
        out["hominin:regions"] = new_regions

    # fossil sites
    sites = out.get("hominin:fossilSites")
    if isinstance(sites, list):
        new_sites = []
        for s in sites:
            ns = dict(s)
            if isinstance(s.get("name"), str):
                ns["name"] = {"fr": s["name"], "en": tr_or_die(SITE_NAMES, s["name"], "site.name")}
            if isinstance(s.get("note"), str):
                ns["note"] = {"fr": s["note"], "en": tr_or_die(SITE_NOTES, s["note"], "site.note")}
            new_sites.append(ns)
        out["hominin:fossilSites"] = new_sites

    # migrations
    migrations = out.get("hominin:migrations")
    if isinstance(migrations, list):
        new_mig = []
        for m in migrations:
            nm = dict(m)
            if isinstance(m.get("label"), str):
                nm["label"] = {"fr": m["label"], "en": tr_or_die(MIGRATION_LABELS, m["label"], "migration.label")}
            new_mig.append(nm)
        out["hominin:migrations"] = new_mig

    return out


def main():
    with SPECIES_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # root description -> i18n
    if isinstance(data.get("description"), str):
        fr = data["description"]
        data["description"] = {"fr": fr, "en": ROOT_DESCRIPTION_EN}

    items = data.get("itemListElement", [])
    new_items = []
    for sp in items:
        try:
            new_items.append(translate_species(sp))
        except KeyError as e:
            print(f"[FATAL] Espèce '{sp.get('@id')}' — {e}", file=sys.stderr)
            sys.exit(1)
    data["itemListElement"] = new_items

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"OK — {OUT_PATH} updated ({len(new_items)} species).")


if __name__ == "__main__":
    main()
