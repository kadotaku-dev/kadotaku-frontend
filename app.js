const API_URL =
"https://kadotaku-backend-production.up.railway.app";

const animeSheetURL =
"https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=licences";

const productsSheetURL =
"https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=produits";

const ADMIN_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbwDt9GgCP1h2sSWD_7cLTMf3jBad8uduL2Mzkv7xzE9-cidD_oz06K4Z6QsXk43r892/exec";
const ADMIN_TOKEN_PARAM = "kadotakuAdmin";
const LICENCE_GROUPS = {
    "Dragon Ball Universe": [
        "Dragon Ball",
        "Dragon Ball Daima",
        "Dragon Ball GT",
        "Dragon Ball Z",
        "Dragon Ball Super",
        "Dragon Ball Games"
    ]
};
const LICENCE_GROUP_PREFIXES = {
    "Tales of Verse": "Tales of"
};

let allProducts = [];
let allAnime = [];
let animeData = [];
let animeHeaders = [];
let allTypes = [];
let allResults = [];
let productsLoaded = false;
let userSelectedSort = false;
let showAllLicencesSecretMode = false;
let licenceCardsRenderGeneration = 0;
let productCardsRenderGeneration = 0;
let refinementMenusRenderGeneration = 0;
let animeRowByLicenceKey = new Map();
let licenceGroupsFromSheet = new Map();
let productsByLicenceKey = new Map();
let licenceGroupCache = new Map();
let menusBuilt = false;
let menusBuilding = false;
let topMenusPinnedLicenceKey = "";
let licenceUniverseMode = "anime";
let secretClickCount = 0;
let secretClickTimer = null;
const DEFAULT_MAX_PRICE = 1000;
const LICENCE_UNIVERSE_STORAGE_KEY =
    "kadotaku_licence_universe_mode";

const HERO_DISPLAY_MODE_STORAGE_KEY =
    "kadotaku_hero_display_mode";

const HERO_BANNER_VARIANT_STORAGE_PREFIX =
    "kadotaku_hero_banner_variant";

const HERO_BANNER_ASSET_ROOT =
    "/images/Bandeaux";

const HERO_BANNER_ASSET_VERSION =
    "20260728-2";

function getHeroBannerAssetPath(
    universe,
    folder,
    file,
    version = HERO_BANNER_ASSET_VERSION
){

    const cache =
        version
            ? `?v=${version}`
            : "";

    return [
        HERO_BANNER_ASSET_ROOT,
        universe,
        folder,
        file
    ].join("/") + cache;
}

function createHeroBannerVariant(
    universe,
    folder,
    id,
    label,
    version = HERO_BANNER_ASSET_VERSION
){

    return {
        id,
        label,
        fond:
            getHeroBannerAssetPath(
                universe,
                folder,
                "fond.webp",
                version
            ),
        calque:
            getHeroBannerAssetPath(
                universe,
                folder,
                "persos.webp",
                version
            ),
        titre:
            getHeroBannerAssetPath(
                universe,
                folder,
                "titre.png",
                version
            ),
        full:
            getHeroBannerAssetPath(
                universe,
                folder,
                "complet.webp",
                version
            ),
        noTitle:
            getHeroBannerAssetPath(
                universe,
                folder,
                "complet_sans_titre.webp",
                version
            )
    };
}

const HERO_GAME_FULL_IMAGE =
    getHeroBannerAssetPath(
        "game",
        "kassandra_lara_defaut",
        "complet.webp"
    );

const HERO_ANIME_FULL_IMAGE =
    getHeroBannerAssetPath(
        "anime",
        "nelliel_frieren_defaut",
        "complet.webp"
    );

const HERO_GAME_FULL_IMAGE_NO_TITLE =
    getHeroBannerAssetPath(
        "game",
        "kassandra_lara_defaut",
        "complet_sans_titre.webp"
    );

const HERO_ANIME_FULL_IMAGE_NO_TITLE =
    getHeroBannerAssetPath(
        "anime",
        "nelliel_frieren_defaut",
        "complet_sans_titre.webp"
    );

const HERO_BANNER_VARIANTS = {
    anime: [
        createHeroBannerVariant(
            "anime",
            "nelliel_frieren_defaut",
            "defaut",
            "Nelliel / Frieren — Défaut"
        ),
        createHeroBannerVariant(
            "anime",
            "nami_lucy_nuit",
            "nami-lucy-nuit",
            "Nami / Lucy — Nuit"
        ),
        createHeroBannerVariant(
            "anime",
            "nami_lucy_jour",
            "nami-lucy-jour",
            "Nami / Lucy — Jour"
        ),
        createHeroBannerVariant(
            "anime",
            "shinso_choso_nuit",
            "shinso-choso-nuit",
            "Shinso / Choso — Nuit"
        ),
        createHeroBannerVariant(
            "anime",
            "shinso_choso_jour",
            "shinso-choso-jour",
            "Shinso / Choso — Jour"
        ),
        createHeroBannerVariant(
            "anime",
            "sailormoon_sakura_nuit",
            "sailormoon-sakura-nuit",
            "Sailor Moon / Sakura — Nuit"
        ),
        createHeroBannerVariant(
            "anime",
            "sailormoon_sakura_jour",
            "sailormoon-sakura-jour",
            "Sailor Moon / Sakura — Jour"
        ),
        createHeroBannerVariant(
            "anime",
            "tohru_haruhi",
            "tohru-haruhi",
            "Tohru / Haruhi — Jour"
        ),
        createHeroBannerVariant(
            "anime",
            "titan_colossal",
            "titan-colossal",
            "Titan colossal"
        ),
        createHeroBannerVariant(
            "anime",
            "mikasa_casca_v3",
            "mikasa-casca-v3",
            "Mikasa / Casca — V3",
            "20260729-2"
        ),
        createHeroBannerVariant(
            "anime",
            "mikasa_casca_v2",
            "mikasa-casca-v2",
            "Mikasa / Casca — V2"
        )
    ],
    game: [
        createHeroBannerVariant(
            "game",
            "kassandra_lara_defaut",
            "defaut",
            "Kassandra / Lara — Défaut",
            "20260730-game-title-complete"
        )
    ]
};

const heroFullTitleVisible = {
    anime: true,
    game: true
};

let heroFullNoTitleAvailable = true;
let heroFullNoTitleCheckToken = 0;

const HERO_THEME_CACHE = new Map();

let heroDisplayMode =
    localStorage.getItem(
        HERO_DISPLAY_MODE_STORAGE_KEY
    ) || "banner";
const NEW_LICENCE_WINDOW_DAYS = 14;
const DISMISSED_NEW_LICENCES_KEY =
    "kadotaku_dismissed_new_licences";
const NEW_LICENCES_SEEN_SESSION_KEY =
    "kadotaku_new_licences_seen_session";

const SIDEBAR_PROMO_VARIANTS = {
    anime: {
        home: [
            ["fern","Fern"],
            ["groupe","Groupe"],
            ["junko-enoshima","Junko Enoshima"],
            ["kohaku","Kohaku"],
            ["mitsuri-kanroji","Mitsuri Kanroji"],
            ["momo-ayase","Momo Ayase"],
            ["yor-forger","Yor Forger"]
        ].map(([id,label]) => ({
            id,
            label,
            image:
                `/images/Cards Accueil/Bouton Accueil Anime - ${label}.webp`
        })),
        catalogue: [
            ["frieren-fern","Frieren et Fern"],
            ["nami","Nami"],
            ["nelliel-harribel","Nelliel et Tier Harribel"],
            ["rem-ram","Rem et Ram"],
            ["shuna-shion","Shuna et Shion"]
        ].map(([id,label]) => ({
            id,
            label,
            image:
                `/images/Cards Catalogue/Bouton Catalogue Anime - ${label}.webp`
        }))
    },
    game: {
        home: [
            ["ada-wong","Ada Wong"],
            ["ahri","Ahri"],
            ["gustave","Gustave"],
            ["hatsune-miku","Hatsune Miku"],
            ["kassandra","Kassandra"],
            ["lara-croft","Lara Croft"],
            ["mario","Mario"],
            ["princesse-zelda","Princesse Zelda"],
            ["sniper-wolf-v1","Sniper Wolf v1"],
            ["sniper-wolf-v2","Sniper Wolf v2"],
            ["verso","Verso"]
        ].map(([id,label]) => ({
            id,
            label,
            image:
                `/images/Cards Accueil/Bouton Accueil Game - ${label}.webp`
        })),
        catalogue: [
            ["chun-li-cammy","Chun-Li et Cammy"],
            ["jinx-vi","Jinx et Vi"],
            ["lune-sciel","Lune et Sciel"],
            ["meryl-sniper-wolf","Meryl Silverburgh et Sniper Wolf"],
            ["nathan-chloe","Nathan Drake et Chloe Frazer"]
        ].map(([id,label]) => ({
            id,
            label,
            image:
                `/images/Cards Catalogue/Bouton Catalogue Game - ${label}.webp`
        }))
    }
};

let sidebarPromoState = {
    mode: "",
    licence: ""
};

let mobileSidebarPromoCollapsed = false;

let waifuMode = false;

let quickTopType = "";
let refineTopType = "";
let refineTopPerso = "";

let favorites = JSON.parse(
    localStorage.getItem(
        'kadotaku_favorites'
    ) || '[]'
);

let favoritesMode = false;

const USER_LICENCE_FAVORITES_KEY =
    "kadotaku_user_licence_favorites";

function loadUserLicenceFavorites(){

    try{

        const stored =
            JSON.parse(
                localStorage.getItem(
                    USER_LICENCE_FAVORITES_KEY
                ) || "[]"
            );

        return Array.isArray(stored)
            ? stored.filter(value =>
                typeof value === "string" &&
                value.trim()
            )
            : [];

    } catch(error){

        return [];
    }
}

let userLicenceFavorites =
    loadUserLicenceFavorites();

let routeLicenceFilter = "";

routeLicenceFilter = "";

function ensureExperimentalTopFilters(){

    const expectedSlogan =
        "La r\u00e9f\u00e9rence pour tous les fans d'animes, mangas et jeux vid\u00e9o";

    const header =
        document.querySelector(".main-header");

    const headerLeft =
        document.querySelector(".main-header-left");

    const titleWrapper =
        document.querySelector(".main-title-wrapper");

    const title =
        titleWrapper?.querySelector(".main-title");

    if(
        !header ||
        !headerLeft ||
        !titleWrapper
    ){
        return;
    }

    let sloganBar =
        document.querySelector(".slogan-bar");

    if(!sloganBar){

        sloganBar =
            document.createElement("div");

        sloganBar.className = "slogan-bar";

        header.insertAdjacentElement(
            "beforebegin",
            sloganBar
        );
    }

    if(title){

        if(
            !title.querySelector(
                ".experimental-slogan-text"
            )
        ){

            title.textContent = "";

            const sloganTextElement =
                document.createElement("span");

            sloganTextElement.className =
                "experimental-slogan-text";

            sloganTextElement.textContent =
                expectedSlogan;

            title.appendChild(
                sloganTextElement
            );
        }
        else{
            title.querySelector(
                ".experimental-slogan-text"
            ).textContent = expectedSlogan;
        }

        sloganBar.appendChild(title);
    }

    let navigationGroup =
        document.getElementById(
            "navigationTopControls"
        );

    if(!navigationGroup){

        navigationGroup =
            document.createElement("div");

        navigationGroup.id =
            "navigationTopControls";

        navigationGroup.className =
            "standalone-navigation-controls";

        navigationGroup.innerHTML = `
            <div class="top-control-group-content"></div>
        `;

        headerLeft.prepend(
            navigationGroup
        );
    }

    const navigationContent =
        navigationGroup.querySelector(
            ".top-control-group-content"
        );

    headerLeft
        .querySelectorAll(
            ":scope > .top-icon-button"
        )
        .forEach(button =>{

            button.classList.add(
                "experimental-navigation-button"
            );

            if(
                !button.querySelector(
                    ".experimental-navigation-label"
                )
            ){

                const label =
                    document.createElement("span");

                label.className =
                    "experimental-navigation-label";

                label.textContent =
                    button.title ||
                    "Navigation";

                button.appendChild(
                    label
                );
            }

            navigationContent?.appendChild(
                button
            );
        });

    let universeGroup =
        document.getElementById(
            "universeTopControls"
        );

    if(!universeGroup){

        universeGroup =
            document.createElement("div");

        universeGroup.id =
            "universeTopControls";

        universeGroup.className =
            "top-control-group top-control-group-universe";

        universeGroup.innerHTML = `
            <div class="top-filter-group-label">
                Univers
            </div>

            <div class="top-control-group-content"></div>
        `;

        navigationGroup.insertAdjacentElement(
            "afterend",
            universeGroup
        );
    }

    const licenceMenu =
        document
            .getElementById("licencesDropdown")
            ?.closest(".menu-item");

    const typeMenu =
        document
            .getElementById("typesDropdown")
            ?.closest(".menu-item");

    let newSearchGroup =
        document.getElementById(
            "newSearchTopFilters"
        );

    if(!newSearchGroup){

        newSearchGroup =
            document.createElement("div");

        newSearchGroup.id =
            "newSearchTopFilters";

        newSearchGroup.className =
            "top-filter-group top-filter-group-new";

        newSearchGroup.innerHTML = `
            <div class="top-filter-group-label">
                Nouvelle recherche
            </div>
        `;

        headerLeft.appendChild(
            newSearchGroup
        );
    }

    if(licenceMenu){
        newSearchGroup.appendChild(
            licenceMenu
        );
    }

    if(typeMenu){
        newSearchGroup.appendChild(
            typeMenu
        );
    }

    let refineGroup =
        document.getElementById(
            "refineTopFilters"
        );

    if(!refineGroup){

        refineGroup =
            document.createElement("div");

        refineGroup.id =
            "refineTopFilters";

        refineGroup.className =
            "top-filter-group top-filter-group-refine";

        refineGroup.hidden = true;

        refineGroup.innerHTML = `
            <div class="top-filter-group-label">
                Affiner la recherche en cours
            </div>

            <div class="menu-item refine-menu-item">
                <span
                    class="refine-menu-label"
                    id="refineTypeLabel"
                >
                    Type
                </span>
                <span class="menu-arrow">&#9660;</span>

                <div
                    class="dropdown refine-dropdown"
                    id="refineTypesDropdown"
                ></div>
            </div>

            <div class="menu-item refine-menu-item">
                <span
                    class="refine-menu-label"
                    id="refinePersoLabel"
                >
                    <span class="refine-perso-label-desktop">
                        Personnage
                    </span>
                    <span class="refine-perso-label-mobile">
                        Persos
                    </span>
                </span>
                <span class="menu-arrow">&#9660;</span>

                <div
                    class="dropdown refine-dropdown"
                    id="refinePersosDropdown"
                ></div>
            </div>
        `;

        headerLeft.appendChild(
            refineGroup
        );
    }

    let toolsGroup =
        document.getElementById(
            "toolsTopControls"
        );

    if(!toolsGroup){

        toolsGroup =
            document.createElement("div");

        toolsGroup.id =
            "toolsTopControls";

        toolsGroup.className =
            "top-control-group top-control-group-neutral top-control-group-tools";

        toolsGroup.innerHTML = `
            <div class="top-filter-group-label">
                Outils
            </div>

            <div class="top-control-group-content"></div>
        `;

        headerLeft.appendChild(
            toolsGroup
        );
    }

    const toolsContent =
        toolsGroup.querySelector(
            ".top-control-group-content"
        );

    const waifuButton =
        document.getElementById(
            "waifuButton"
        );

    const favoritesButton =
        document.querySelector(
            ".favorites-toggle"
        );

    const headerRight =
        document.querySelector(
            ".main-header-right"
        );

    if(waifuButton){
        toolsContent?.appendChild(
            waifuButton
        );
    }

    if(favoritesButton){
        toolsContent?.appendChild(
            favoritesButton
        );
    }

    if(headerRight){
        toolsContent?.appendChild(
            headerRight
        );
    }

    placeResponsiveSlogan();
}

function placeResponsiveSlogan(){

    const title =
        document.querySelector(".main-title");

    const titleWrapper =
        document.querySelector(".main-title-wrapper");

    const sloganBar =
        document.querySelector(".slogan-bar");

    if(
        !title ||
        !titleWrapper ||
        !sloganBar
    ){
        return;
    }

    if(window.innerWidth <= 768){

        const catalogueButton =
            titleWrapper.querySelector(
                ".mobile-only-icon:last-of-type"
            );

        titleWrapper.insertBefore(
            title,
            catalogueButton || null
        );

        return;
    }

    sloganBar.appendChild(title);
}

function placeMobileHeaderControls(){

    const headerLeft =
        document.querySelector(".main-header-left");

    const universeGroup =
        document.getElementById(
            "universeTopControls"
        );

    const toolsGroup =
        document.getElementById(
            "toolsTopControls"
        );

    const newSearchGroup =
        document.getElementById(
            "newSearchTopFilters"
        );

    const refineGroup =
        document.getElementById(
            "refineTopFilters"
        );

    if(
        !headerLeft ||
        !universeGroup ||
        !toolsGroup ||
        !newSearchGroup ||
        !refineGroup
    ){
        return;
    }

    let mobileActions =
        document.getElementById(
            "mobilePrimaryActions"
        );

    if(!mobileActions){

        mobileActions =
            document.createElement("div");

        mobileActions.id =
            "mobilePrimaryActions";

        mobileActions.className =
            "mobile-primary-actions";
    }

    if(window.innerWidth <= 768){

        const universeSwitch =
            document.getElementById(
                "universeSwitch"
            );

        const waifuButton =
            document.getElementById(
                "waifuButton"
            );

        const favoritesButton =
            document.querySelector(
                ".favorites-toggle"
            );

        headerLeft.insertBefore(
            mobileActions,
            newSearchGroup
        );

        if(universeSwitch){
            mobileActions.appendChild(
                universeSwitch
            );
        }

        if(waifuButton){
            mobileActions.appendChild(
                waifuButton
            );
        }

        if(favoritesButton){
            mobileActions.appendChild(
                favoritesButton
            );
        }

        headerLeft.insertBefore(
            newSearchGroup,
            refineGroup
        );

        headerLeft.insertBefore(
            refineGroup,
            toolsGroup
        );

        return;
    }

    placeUniverseSwitchForViewport();
    placeFavoritesButtonForViewport();

    if(mobileActions.isConnected){
        mobileActions.remove();
    }
}

function updateRefinementGroupVisibility(
    hasVisibleProducts
){

    const refineGroup =
        document.getElementById(
            "refineTopFilters"
        );

    if(!refineGroup){
        return;
    }

    refineGroup.hidden =
        !hasVisibleProducts;

    refineGroup.classList.toggle(
        "is-available",
        hasVisibleProducts
    );
}

function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;");
}

function escapeAttr(value){

    return escapeHtml(value);
}

function normalizeHeaderName(value){

    return normalizeText(value)
        .replace(/[^a-z0-9]/g,"");
}

function getLicenceActivationDateIndex(){

    const acceptedHeaders =
        new Set([
            "dateactivation",
            "activationdate",
            "activele",
            "actifle",
            "datedactivation",
            "dateactif",
            "dateactive",
            "nouveaudepuis",
            "nouveaute",
            "nouveauteactive"
        ]);

    return animeHeaders.findIndex(header =>
        acceptedHeaders.has(
            normalizeHeaderName(header)
        )
    );
}

function getLicenceUniverseIndex(){

    const acceptedHeaders =
        new Set([
            "univers",
            "universe",
            "media",
            "categorie",
            "category",
            "typecontenu",
            "typelicence",
            "licencekind",
            "kind",
            "animegame",
            "animeougame"
        ]);

    return animeHeaders.findIndex(header =>{

        const normalized =
            normalizeHeaderName(header);

        return acceptedHeaders.has(normalized) ||
            normalized.startsWith("univers") ||
            normalized.startsWith("universe");
    });
}

function getLicenceGroupColumnIndex(){

    const acceptedHeaders =
        new Set([
            "groupe",
            "grouplique",
            "licencegroupe",
            "licencegroup",
            "groupelicence",
            "groupelicences",
            "licenceparente",
            "parentlicence",
            "universgroupe"
        ]);

    const headerIndex =
        animeHeaders.findIndex(header =>
            acceptedHeaders.has(
                normalizeHeaderName(header)
            )
        );

    return headerIndex >= 0
        ? headerIndex
        : 3;
}

function normalizeLicenceUniverse(value){

    const normalized =
        normalizeLicenceKey(value);

    if(
        normalized === "game" ||
        normalized === "games" ||
        normalized === "jeu" ||
        normalized === "jeux" ||
        normalized === "jeuvideo" ||
        normalized === "jeuxvideo" ||
        normalized === "videogame" ||
        normalized === "videogames"
    ){
        return "game";
    }

    return "anime";
}

function getLicenceUniverses(rowOrLicence){

    const row =
        Array.isArray(rowOrLicence)
            ? rowOrLicence
            : getLicenceRow(rowOrLicence);

    if(!row){
        return ["anime"];
    }

    const universeIndex =
        getLicenceUniverseIndex();

    if(universeIndex < 0){
        return ["anime"];
    }

    const universes =
        splitMultiValues(row[universeIndex])
            .map(normalizeLicenceUniverse);

    return universes.length
        ? [...new Set(universes)]
        : ["anime"];
}

function isLicenceInCurrentUniverse(licenceOrRow){

    return getLicenceUniverses(licenceOrRow)
        .includes(licenceUniverseMode);
}

function loadLicenceUniverseMode(){

    const stored =
        localStorage.getItem(
            LICENCE_UNIVERSE_STORAGE_KEY
        );

    licenceUniverseMode =
        stored === "game"
            ? "game"
            : "anime";
}

function saveLicenceUniverseMode(){

    localStorage.setItem(
        LICENCE_UNIVERSE_STORAGE_KEY,
        licenceUniverseMode
    );
}

function ensureUniverseSwitch(){

    if(document.getElementById("universeSwitch")){
        placeUniverseSwitchForViewport();
        updateUniverseSwitch();
        return;
    }

    const switcher =
        document.createElement("div");

    switcher.id = "universeSwitch";
    switcher.className = "universe-switch";
    switcher.setAttribute("role","group");
    switcher.setAttribute(
        "aria-label",
        "Choisir le type de licences"
    );

    switcher.innerHTML = `
        <button
            type="button"
            class="universe-switch-option"
            data-universe="anime"
            onclick="setLicenceUniverseMode('anime')"
        >
            <span class="universe-label-desktop">
                Animes / Mangas
            </span>
            <span class="universe-label-mobile">
                Anime
            </span>
        </button>
        <button
            type="button"
            class="universe-switch-option"
            data-universe="game"
            onclick="setLicenceUniverseMode('game')"
        >
            <span class="universe-label-desktop">
                Jeux Vid&eacute;o
            </span>
            <span class="universe-label-mobile">
                Jeux Vid&eacute;o
            </span>
        </button>
    `;

    const universeContent =
        document.querySelector(
            "#universeTopControls .top-control-group-content"
        );

    const headerLeft =
        document.querySelector(
            ".main-header-left"
        );

    if(universeContent){
        universeContent.appendChild(
            switcher
        );
    } else if(headerLeft){
        headerLeft.prepend(
            switcher
        );
    } else {
        document.body.prepend(
            switcher
        );
    }

    updateUniverseSwitch();
}

function placeUniverseSwitchForViewport(){

    const switcher =
        document.getElementById("universeSwitch");

    if(!switcher){
        return;
    }

    const universeContent =
        document.querySelector(
            "#universeTopControls .top-control-group-content"
        );

    if(universeContent){
        universeContent.appendChild(
            switcher
        );
    }
}

function placeFavoritesButtonForViewport(){

    const favoritesButton =
        document.querySelector(".favorites-toggle");

    const waifuButton =
        document.getElementById("waifuButton");

    const toolsContent =
        document.querySelector(
            "#toolsTopControls .top-control-group-content"
        );

    if(toolsContent){

        const headerRight =
            toolsContent.querySelector(
                ".main-header-right"
            );

        if(waifuButton){
            toolsContent.insertBefore(
                waifuButton,
                headerRight || null
            );
        }

        if(favoritesButton){
            toolsContent.insertBefore(
                favoritesButton,
                headerRight || null
            );
        }
    }
}

function updateUniverseSwitch(){

    document
        .querySelectorAll(
            ".universe-switch-option"
        )
        .forEach(button =>{

            const active =
                button.dataset.universe ===
                licenceUniverseMode;

            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-pressed",
                active ? "true" : "false"
            );
        });

    updateUniverseHero();
}

function getHeroBannerStorageKey(universe = licenceUniverseMode){

    return [
        HERO_BANNER_VARIANT_STORAGE_PREFIX,
        universe
    ].join("_");
}

function getHeroBannerVariants(universe = licenceUniverseMode){

    return HERO_BANNER_VARIANTS[universe] ||
        HERO_BANNER_VARIANTS.anime ||
        [];
}

function getSelectedHeroBannerVariantId(universe = licenceUniverseMode){

    try{
        return localStorage.getItem(
            getHeroBannerStorageKey(universe)
        ) || "defaut";
    } catch(error){
        return "defaut";
    }
}

function getCurrentHeroBannerVariant(){

    const variants =
        getHeroBannerVariants();

    const defaut =
        variants.find(variant =>
            variant.id === "defaut"
        ) || variants[0] || {};

    const selected =
        variants.find(variant =>
            variant.id === getSelectedHeroBannerVariantId()
        ) || defaut;

    return {
        ...defaut,
        ...selected
    };
}

function cycleHeroBannerVariant(
    event,
    direction = 1
){

    event.preventDefault();
    event.stopPropagation();

    const variants =
        getHeroBannerVariants();

    if(variants.length < 2){
        return false;
    }

    const currentId =
        getSelectedHeroBannerVariantId();

    const currentIndex =
        Math.max(
            0,
            variants.findIndex(variant =>
                variant.id === currentId
            )
        );

    const nextVariant =
        variants[
            (
                currentIndex +
                direction +
                variants.length
            ) %
            variants.length
        ];

    try{
        if(nextVariant.id === "defaut"){
            localStorage.removeItem(
                getHeroBannerStorageKey()
            );
        } else {
            localStorage.setItem(
                getHeroBannerStorageKey(),
                nextVariant.id
            );
        }
    } catch(error){
        // La variante change quand même pour le rendu courant.
    }

    updateUniverseHero();

    return false;
}

function updateUniverseHero(){

    const heroBackground =
        document.querySelector(".hero-background");

    const heroOverlay =
        document.querySelector(".hero-overlay");

    const heroTitle =
        document.querySelector(".hero-title");

    const heroBanner =
        getCurrentHeroBannerVariant();

    const isGameUniverse =
        licenceUniverseMode === "game";

    if(heroBackground){
        heroBackground.style.backgroundImage =
            `url("${heroBanner.fond}")`;
    }

    if(heroOverlay){
        heroOverlay.src =
            heroBanner.calque;

        heroOverlay.alt =
            isGameUniverse
                ? "Bandeau Kadotaku Jeux Vid\u00e9o"
                : "Bandeau Kadotaku Animes et Mangas";
    }

    if(heroTitle){
        if(heroBanner.titre){
            heroTitle.src =
                heroBanner.titre;

            heroTitle.hidden =
                false;

            heroTitle.alt =
                "Logo Kadotaku";
        } else {
            heroTitle.removeAttribute("src");
            heroTitle.hidden =
                true;
        }
    }

    applyHeroDisplayMode();
    checkHeroFullNoTitleAvailability();
    updateSiteThemeFromHero();
}

function getCurrentHeroThemePath(){
    return getCurrentHeroBannerVariant().fond;
}

function setSiteThemeColors(colors){
    const root =
        document.documentElement;

    root.style.setProperty(
        "--site-bg",
        colors.bg
    );

    root.style.setProperty(
        "--site-bg-soft",
        colors.soft
    );

    root.style.setProperty(
        "--site-bg-panel",
        colors.panel
    );
}

function clampColor(value){
    return Math.max(
        0,
        Math.min(
            255,
            Math.round(value)
        )
    );
}

function colorToRgb(color){
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function makeThemeFromAverageColor(color){
    const bg = {
        r: clampColor(color.r * 0.28),
        g: clampColor(color.g * 0.28),
        b: clampColor(color.b * 0.36)
    };

    const soft = {
        r: clampColor(bg.r + 8),
        g: clampColor(bg.g + 10),
        b: clampColor(bg.b + 14)
    };

    const panel = {
        r: clampColor(bg.r + 18),
        g: clampColor(bg.g + 22),
        b: clampColor(bg.b + 30)
    };

    return {
        bg: colorToRgb(bg),
        soft: colorToRgb(soft),
        panel: colorToRgb(panel)
    };
}

function updateSiteThemeFromHero(){
    const imagePath =
        getCurrentHeroThemePath();

    if(HERO_THEME_CACHE.has(imagePath)){
        setSiteThemeColors(
            HERO_THEME_CACHE.get(imagePath)
        );
        return;
    }

    const image =
        new Image();

    image.crossOrigin = "anonymous";

    image.onload = () =>{
        try{
            const canvas =
                document.createElement("canvas");
            const context =
                canvas.getContext("2d",{
                    willReadFrequently:true
                });

            if(!context){
                return;
            }

            canvas.width = 96;
            canvas.height = 32;

            context.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const pixels =
                context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                ).data;

            let totalWeight = 0;
            let red = 0;
            let green = 0;
            let blue = 0;

            for(
                let index = 0;
                index < pixels.length;
                index += 4
            ){
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const alpha = pixels[index + 3] / 255;
                const brightness =
                    (r + g + b) / 3;

                if(alpha < 0.5 || brightness > 235){
                    continue;
                }

                const weight =
                    alpha *
                    (
                        brightness < 35
                            ? 0.35
                            : 1
                    );

                red += r * weight;
                green += g * weight;
                blue += b * weight;
                totalWeight += weight;
            }

            if(!totalWeight){
                return;
            }

            const theme =
                makeThemeFromAverageColor({
                    r:red / totalWeight,
                    g:green / totalWeight,
                    b:blue / totalWeight
                });

            HERO_THEME_CACHE.set(
                imagePath,
                theme
            );

            setSiteThemeColors(theme);
        } catch(error){
            console.warn(
                "Theme bandeau indisponible",
                error
            );
        }
    };

    image.src = imagePath;
}

function ensureHeroDisplayControls(){

    const hero =
        document.querySelector(".hero");

    if(!hero){
        return;
    }

    let fullImage =
        hero.querySelector(".hero-full-image");

    if(!fullImage){
        fullImage = document.createElement("img");
        fullImage.className = "hero-full-image";
        fullImage.alt =
            "Bandeau Kadotaku Jeux Vid\u00e9o complet";
        fullImage.loading = "eager";
        fullImage.decoding = "async";
        fullImage.addEventListener("click",event =>{
            if(heroDisplayMode !== "full"){
                return;
            }

            event.stopPropagation();
            openModal(
                getHeroFullImagePath(),
                true,
                "",
                true
            );
        });
        hero.appendChild(fullImage);
    }

    let controls =
        hero.querySelector(".hero-display-controls");

    if(!controls){
        controls = document.createElement("div");
        controls.className = "hero-display-controls";
        controls.innerHTML = `
            <button
                type="button"
                class="hero-display-button hero-display-up"
                aria-label="R&eacute;duire le bandeau"
                title="R&eacute;duire le bandeau"
            >&#8593;</button>
            <button
                type="button"
                class="hero-display-button hero-display-down"
                aria-label="Agrandir le bandeau"
                title="Agrandir le bandeau"
            >&#8595;</button>
            <button
                type="button"
                class="hero-display-button hero-display-title-toggle"
                aria-label="Afficher la version sans titre"
                title="Afficher la version sans titre"
            ></button>
            <div
                class="hero-banner-variant-controls"
            >
                <button
                    type="button"
                    class="hero-display-button hero-banner-variant-cycle"
                    data-direction="-1"
                    aria-label="Bandeau précédent"
                    title="Bandeau précédent"
                >&#8592;</button>
                <button
                    type="button"
                    class="hero-display-button hero-banner-variant-cycle"
                    data-direction="1"
                    aria-label="Bandeau suivant"
                    title="Bandeau suivant"
                >&#8594;</button>
            </div>
        `;

        controls.addEventListener("click",event =>{
            event.stopPropagation();

            if(
                event.target.closest(
                    ".hero-banner-variant-cycle"
                )
            ){
                const cycleButton =
                    event.target.closest(
                        ".hero-banner-variant-cycle"
                    );

                cycleHeroBannerVariant(
                    event,
                    Number(
                        cycleButton.dataset.direction
                    ) || 1
                );
            } else if(
                event.target.closest(
                    ".hero-display-title-toggle"
                )
            ){
                toggleHeroFullTitle();
            } else if(
                event.target.closest(
                    ".hero-display-up"
                )
            ){
                stepHeroDisplayMode(-1);
            } else if(
                event.target.closest(
                    ".hero-display-down"
                )
            ){
                stepHeroDisplayMode(1);
            }
        });

        hero.appendChild(controls);
    }

    checkHeroFullNoTitleAvailability();
    applyHeroDisplayMode();
}

function getHeroFullImageNoTitlePath(){

    return getCurrentHeroBannerVariant().noTitle ||
        (
            licenceUniverseMode === "game"
                ? HERO_GAME_FULL_IMAGE_NO_TITLE
                : HERO_ANIME_FULL_IMAGE_NO_TITLE
        );
}

function checkHeroFullNoTitleAvailability(){

    const universe = licenceUniverseMode;
    const path = getHeroFullImageNoTitlePath();
    const token = ++heroFullNoTitleCheckToken;
    const probe = new Image();

    heroFullNoTitleAvailable =
        universe === "anime";
    applyHeroDisplayMode();

    probe.onload = () =>{
        if(
            token !== heroFullNoTitleCheckToken ||
            universe !== licenceUniverseMode
        ){
            return;
        }

        heroFullNoTitleAvailable = true;
        applyHeroDisplayMode();
    };

    probe.onerror = () =>{
        if(
            token !== heroFullNoTitleCheckToken ||
            universe !== licenceUniverseMode
        ){
            return;
        }

        heroFullNoTitleAvailable = false;
        heroFullTitleVisible[universe] = true;
        applyHeroDisplayMode();
    };

    probe.src = path;
}

function toggleHeroFullTitle(){

    if(
        heroDisplayMode !== "full" ||
        !heroFullNoTitleAvailable
    ){
        return;
    }

    heroFullTitleVisible[licenceUniverseMode] =
        !heroFullTitleVisible[licenceUniverseMode];

    applyHeroDisplayMode();
}

function getHeroTitleToggleIcon(titleIsVisible){

    if(titleIsVisible){
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                <circle cx="12" cy="12" r="2.8"></circle>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18"></path>
            <path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8"></path>
            <path d="M6.2 6.2C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8"></path>
        </svg>
    `;
}

function stepHeroDisplayMode(direction){

    const modes =
        ["hidden","banner","full"];

    const currentIndex =
        Math.max(
            0,
            modes.indexOf(heroDisplayMode)
        );

    const nextIndex =
        Math.max(
            0,
            Math.min(
                modes.length - 1,
                currentIndex + direction
            )
        );

    heroDisplayMode = modes[nextIndex];

    localStorage.setItem(
        HERO_DISPLAY_MODE_STORAGE_KEY,
        heroDisplayMode
    );

    applyHeroDisplayMode();
}

function applyHeroDisplayMode(){

    const hero =
        document.querySelector(".hero");

    const spacer =
        document.querySelector(".hero-spacer");

    if(!hero){
        return;
    }

    document.body.classList.remove(
        "hero-mode-hidden",
        "hero-mode-banner",
        "hero-mode-full"
    );

    document.body.classList.add(
        `hero-mode-${heroDisplayMode}`
    );

    hero.dataset.displayMode =
        heroDisplayMode;

    if(spacer){
        spacer.dataset.displayMode =
            heroDisplayMode;
    }

    const fullImage =
        hero.querySelector(".hero-full-image");

    if(fullImage){
        fullImage.src =
            getHeroFullImagePath();

        fullImage.alt =
            licenceUniverseMode === "game"
                ? "Bandeau Kadotaku Jeux Vid\u00e9o complet"
                : "Bandeau Kadotaku Animes et Mangas complet";
    }

    const upButton =
        hero.querySelector(".hero-display-up");

    const downButton =
        hero.querySelector(".hero-display-down");

    const titleToggleButton =
        hero.querySelector(
            ".hero-display-title-toggle"
        );

    const bannerVariantControls =
        hero.querySelector(
            ".hero-banner-variant-controls"
        );

    if(upButton){
        upButton.hidden =
            heroDisplayMode === "hidden";
    }

    if(downButton){
        downButton.hidden =
            heroDisplayMode === "full";
    }

    if(titleToggleButton){
        const titleIsVisible =
            heroFullTitleVisible[
                licenceUniverseMode
            ];

        titleToggleButton.hidden =
            heroDisplayMode !== "full" ||
            !heroFullNoTitleAvailable;

        titleToggleButton.innerHTML =
            getHeroTitleToggleIcon(
                titleIsVisible
            );

        const label = titleIsVisible
            ? "Afficher la version sans titre"
            : "Afficher la version avec titre";

        titleToggleButton.setAttribute(
            "aria-label",
            label
        );

        titleToggleButton.setAttribute(
            "title",
            label
        );

        titleToggleButton.setAttribute(
            "aria-pressed",
            titleIsVisible ? "false" : "true"
        );
    }

    if(bannerVariantControls){
        const variants =
            getHeroBannerVariants();

        const currentVariant =
            getCurrentHeroBannerVariant();

        bannerVariantControls.hidden =
            variants.length < 2;

        bannerVariantControls
            .querySelectorAll(
                ".hero-banner-variant-cycle"
            )
            .forEach(button =>{

                const previous =
                    Number(
                        button.dataset.direction
                    ) < 0;

                const label =
                    `${
                        previous
                            ? "Bandeau précédent"
                            : "Bandeau suivant"
                    } — ${currentVariant.label}`;

                button.setAttribute(
                    "aria-label",
                    label
                );

                button.setAttribute(
                    "title",
                    label
                );
            });
    }
}

function getHeroFullImagePath(){

    if(
        heroFullNoTitleAvailable &&
        !heroFullTitleVisible[licenceUniverseMode]
    ){
        return getHeroFullImageNoTitlePath();
    }

    return getCurrentHeroBannerVariant().full ||
        (
            licenceUniverseMode === "game"
                ? HERO_GAME_FULL_IMAGE
                : HERO_ANIME_FULL_IMAGE
        );
}

function setLicenceUniverseMode(mode){

    const nextMode =
        mode === "game"
            ? "game"
            : "anime";

    if(nextMode === licenceUniverseMode){
        return;
    }

    licenceUniverseMode = nextMode;
    saveLicenceUniverseMode();
    updateUniverseSwitch();

    window.history.replaceState(
        null,
        "",
        "/"
    );

    resetAllFiltersForTopDropdown();
    clearMainFilters();

    routeLicenceFilter = "";
    quickTopType = "";
    refineTopType = "";
    refineTopPerso = "";

    rebuildVisibleLicenceList();

    refreshAllTypes();

    menusBuilt = false;
    topMenusPinnedLicenceKey = "";

    buildLicenceCards();
    updateSidebarPromoCard("home");

    if(productsLoaded){
        buildSidebar();
        buildTopMenus();
        menusBuilt = true;

        scheduleRefinementMenusUpdate(
            allProducts.filter(product =>
                isLicenceVisible(
                    product.licence
                )
            ),
            false
        );

        handleLicenceRoute();
    }
}

function licenceFavoritesEnabled(){

    return licenceUniverseMode === "anime";
}

function rebuildVisibleLicenceList(){

    allAnime = animeData
        .filter(r =>
            isLicenceInCurrentUniverse(r) &&
            (
                showAllLicencesSecretMode ||
                r[2] == "1"
            )
        )
        .map(r => r[0]);
}

function parseLicenceActivationDate(value){

    const clean =
        String(value || "").trim();

    if(!clean){
        return null;
    }

    let year;
    let month;
    let day;

    let match =
        clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

    if(match){
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
    } else {

        match =
            clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

        if(match){
            day = Number(match[1]);
            month = Number(match[2]);
            year = Number(match[3]);
        }
    }

    if(!year || !month || !day){
        return null;
    }

    const date =
        new Date(year,month - 1,day);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function loadDismissedNewLicences(){

    try{

        return JSON.parse(
            localStorage.getItem(
                DISMISSED_NEW_LICENCES_KEY
            ) || "[]"
        );

    } catch(error){

        return [];
    }
}

function saveDismissedNewLicences(licences){

    localStorage.setItem(
        DISMISSED_NEW_LICENCES_KEY,
        JSON.stringify(
            [...new Set(licences)]
        )
    );
}

function cameFromKadotakuPage(){

    if(!document.referrer){
        return false;
    }

    try{

        const referrerUrl =
            new URL(document.referrer);

        return referrerUrl.origin ===
            window.location.origin;

    } catch(error){

        return false;
    }
}

function shouldShowNewLicencesModal(){

    return (
        sessionStorage.getItem(
            NEW_LICENCES_SEEN_SESSION_KEY
        ) !== "1" &&
        !cameFromKadotakuPage()
    );
}

function slugLicence(licence){

    return String(licence || "")
        .trim()
        .toLowerCase()
        .replace(/[.\s]+/g,"-")
        .replace(/-+/g,"-");
}

function initAdminMode(){

    const params =
        new URLSearchParams(
            window.location.search
        );

    const token =
        params.get(ADMIN_TOKEN_PARAM);

    if(token){

        sessionStorage.setItem(
            "kadotaku_admin_token",
            token
        );

        sessionStorage.setItem(
            "kadotaku_admin_enabled",
            "1"
        );

        params.delete(ADMIN_TOKEN_PARAM);

        const cleanQuery =
            params.toString();

        const cleanUrl =
            window.location.pathname +
            (cleanQuery ? `?${cleanQuery}` : "") +
            window.location.hash;

        window.history.replaceState(
            {},
            "",
            cleanUrl
        );
    }

    document.body.classList.toggle(
        "admin-mode",
        isAdminMode()
    );
}

function isAdminMode(){

    return (
        sessionStorage.getItem(
            "kadotaku_admin_enabled"
        ) === "1" &&
        Boolean(
            sessionStorage.getItem(
                "kadotaku_admin_token"
            )
        )
    );
}

function getAdminToken(){

    return sessionStorage.getItem(
        "kadotaku_admin_token"
    ) || "";
}

function showAdminMessage(message,type = "info"){

    let box =
        document.getElementById(
            "adminMessage"
        );

    if(!box){

        box =
            document.createElement("div");

        box.id = "adminMessage";
        box.className = "admin-message";

        document.body.appendChild(box);
    }

    box.textContent = message;
    box.className =
        `admin-message ${type}`;

    clearTimeout(
        showAdminMessage.timer
    );

    showAdminMessage.timer =
        setTimeout(()=>{
            box.remove();
        },3200);
}

async function adminHideProduct(button){

    if(!isAdminMode()){
        return;
    }

    if(!ADMIN_SCRIPT_URL){

        showAdminMessage(
            "URL Apps Script admin manquante",
            "error"
        );

        return;
    }

    const card =
        button.closest(".card");

    const productUrl =
        button.dataset.productUrl || "";

    const productName =
        button.dataset.productName || "";

    const productRuntimeId =
        button.dataset.productRuntimeId || "";

    if(
        !confirm(
            `Masquer cet article dans Kadotaku ?\n\n${productName}`
        )
    ){
        return;
    }

    button.disabled = true;
    button.classList.add("loading");

    try{

        await fetch(
            ADMIN_SCRIPT_URL,
            {
                method:"POST",
                mode:"no-cors",
                headers:{
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },
                body:JSON.stringify({
                    action:"deactivateProduct",
                    token:getAdminToken(),
                    productUrl,
                    productName,
                    productImage:
                        button.dataset.productImage || "",
                    licence:
                        button.dataset.licence || ""
                })
            }
        );

        if(card){
            card.classList.add(
                "admin-removed"
            );
        }

        allProducts =
            allProducts.filter(
                p =>
                    p._runtimeId !==
                    productRuntimeId
            );

        rebuildProductIndexes();

        allResults =
            allResults.filter(
                p =>
                    p._runtimeId !==
                    productRuntimeId
            );

        setTimeout(()=>{
            card?.remove();
        },180);

        showAdminMessage(
            "Demande envoyée : actif = 0",
            "success"
        );

    } catch(error){

        console.error(error);

        button.disabled = false;
        button.classList.remove("loading");

        showAdminMessage(
            "Erreur pendant l'envoi admin",
            "error"
        );
    }
}

initAdminMode();

function toggleWaifuMode(){

    waifuMode = !waifuMode;

    const button =
        document.getElementById('waifuButton');

    if(waifuMode){

    button.classList.add('active');

} else {

    button.classList.remove('active');

    setTimeout(()=>{
        button.textContent = 'Mode Waifu';
    },0);
}

button.textContent =
    'Mode Waifu';

    startSearch();
}

function saveFavorites(){

    localStorage.setItem(
        'kadotaku_favorites',
        JSON.stringify(favorites)
    );
}

function isFavorite(id){

    return favorites.includes(
        String(id)
    );
}

function toggleFavorite(id,button = null){

    id = String(id);

    if(isFavorite(id)){

        favorites =
            favorites.filter(
                f => f !== id
            );

    } else {

        favorites.push(id);
    }

    saveFavorites();

    updateFavoritesButton();

    const matchingFavoriteButtons =
        document
            .querySelectorAll(
                ".favorite-btn"
            );

    matchingFavoriteButtons
        .forEach(favoriteButton=>{

            if(
                favoriteButton.dataset.productUrl ===
                id
            ){
                if(
                    favoritesMode &&
                    !isFavorite(id)
                ){
                    favoriteButton
                        .closest(".card")
                        ?.remove();

                    return;
                }

                favoriteButton.classList.toggle(
                    "active",
                    isFavorite(id)
                );
            }
        });

    if(
        favoritesMode &&
        !isFavorite(id)
    ){
        allResults =
            allResults.filter(
                product =>
                    String(product.url) !== id
            );

        showAmazonDisclosure();
    }

    if(button){

        button.classList.toggle(
            "active",
            isFavorite(id)
        );
    }
}

function toggleFavoritesMode(){

    favoritesMode = !favoritesMode;

    updateFavoritesButton();

    startSearch();
}

function updateFavoritesButton(){

    const button =
        document.querySelector(
            '.favorites-toggle'
        );

    if(!button) return;

    button.classList.toggle(
        'active',
        favoritesMode
    );

    const heart =
        `<span class="favorites-toggle-heart">&#10084;</span>`;

    button.innerHTML =
        favorites.length > 0

        ? `${heart} Favoris (${favorites.length})`

        : `${heart} Favoris`;
}

/* CSV */

function parseCSV(text){

    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for(let i = 0; i < text.length; i++){

        const char = text[i];
        const next = text[i + 1];

        if(char === '"' && inQuotes && next === '"'){
            cell += '"';
            i++;
            continue;
        }

        if(char === '"'){
            inQuotes = !inQuotes;
            continue;
        }

        if(char === "," && !inQuotes){
            row.push(cell.trim());
            cell = "";
            continue;
        }

        if((char === "\n" || char === "\r") && !inQuotes){

            if(char === "\r" && next === "\n"){
                i++;
            }

            row.push(cell.trim());

            if(row.some(value => value !== "")){
                rows.push(row);
            }

            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    row.push(cell.trim());

    if(row.some(value => value !== "")){
        rows.push(row);
    }

    return rows;
}

function parseProductPrice(price){

    return parseFloat(
        String(price || "")
            .replace(/[^\d,]/g,"")
            .replace(",",".")
    ) || 0;
}

function splitMultiValues(value){

    return String(value || "")
        .split(/[;|,]/)
        .map(item => item.trim())
        .filter(Boolean);
}

function prepareProduct(product,index){

    product._runtimeId =
        String(index);

    product._randomSort =
        Math.random();

    product._price =
        parseProductPrice(product.price);

    product._persos =
        splitMultiValues(product.perso);

    product._persoKeys =
        new Set(
            product._persos.map(
                normalizeLicenceKey
            )
        );

    product._searchText =
        (
            (product.name || "") + " " +
            (product.licence || "") + " " +
            (product.type || "") + " " +
            product._persos.join(" ")
        ).toLowerCase();

    product._licenceKey =
        normalizeLicenceKey(product.licence || "");

    return product;
}

async function loadProductsFromSheet(){

    const response =
        await fetch(
            productsSheetURL,
            {
                cache:"no-store"
            }
        );

    if(!response.ok){
        throw new Error(
            `Chargement Sheet impossible (${response.status})`
        );
    }

    const rows =
        parseCSV(
            await response.text()
        );

    rows.shift();

    return rows.map(row => ({
        licence:row[0] || "",
        type:row[1] || "",
        name:row[2] || "",
        price:row[3] || "",
        image:row[4] || "",
        url:row[5] || "",
        priority:row[6] || "",
        actif:row[7] || "",
        waifu:row[8] || "",
        perso:row[9] || ""
    }));
}

function getLicenceGroup(licence){

    const licenceKey =
        normalizeLicenceKey(licence);

    const sheetGroup =
        licenceGroupsFromSheet.get(licenceKey);

    const groupEntry =
        Object.entries(LICENCE_GROUPS)
            .find(([groupName]) =>
                normalizeLicenceKey(groupName) === licenceKey
            );

    if(sheetGroup || groupEntry){
        return [
            ...new Set([
                ...(sheetGroup || []),
                ...(groupEntry ? groupEntry[1] : [])
            ])
        ];
    }

    const prefixEntry =
        Object.entries(LICENCE_GROUP_PREFIXES)
            .find(([groupName]) =>
                normalizeLicenceKey(groupName) === licenceKey
            );

    if(!prefixEntry){
        return [];
    }

    if(licenceGroupCache.has(licenceKey)){
        return licenceGroupCache.get(licenceKey);
    }

    const prefixKey =
        normalizeLicenceKey(prefixEntry[1]);

    const knownLicences = [
        ...[
            ...animeRowByLicenceKey.values()
        ]
            .map(row => row[0]),
        ...[
            ...productsByLicenceKey.values()
        ]
            .flatMap(products =>
                products.length
                    ? [products[0].licence]
                    : []
            )
    ];

    const groupLicences = [
        ...new Set(
            knownLicences.filter(candidate => {

                const candidateKey =
                    normalizeLicenceKey(candidate);

                return (
                    candidateKey &&
                    candidateKey !== licenceKey &&
                    candidateKey.startsWith(prefixKey)
                );
            })
        )
    ];

    licenceGroupCache.set(
        licenceKey,
        groupLicences
    );

    return groupLicences;
}

function rebuildAnimeIndexes(){

    animeRowByLicenceKey =
        new Map(
            animeData
                .filter(row => row[0])
                .map(row => [
                    normalizeLicenceKey(row[0]),
                    row
                ])
        );

    licenceGroupsFromSheet = new Map();

    const groupColumnIndex =
        getLicenceGroupColumnIndex();

    animeData
        .filter(row =>
            row[0] &&
            row[groupColumnIndex]
        )
        .forEach(row =>{

            const groupKey =
                normalizeLicenceKey(
                    row[groupColumnIndex]
                );

            if(!groupKey){
                return;
            }

            if(!licenceGroupsFromSheet.has(groupKey)){
                licenceGroupsFromSheet.set(groupKey,[]);
            }

            licenceGroupsFromSheet
                .get(groupKey)
                .push(row[0]);
        });

    licenceGroupCache.clear();
}

function rebuildProductIndexes(){

    productsByLicenceKey = new Map();

    allProducts.forEach(product =>{

        const licenceKey =
            product._licenceKey ||
            normalizeLicenceKey(product.licence);

        if(!licenceKey){
            return;
        }

        if(!productsByLicenceKey.has(licenceKey)){
            productsByLicenceKey.set(
                licenceKey,
                []
            );
        }

        productsByLicenceKey
            .get(licenceKey)
            .push(product);
    });

    licenceGroupCache.clear();
}

function productMatchesLicence(product,licence){

    if(!licence){
        return true;
    }

    const licenceKey =
        normalizeLicenceKey(licence);

    const productKey =
        product._licenceKey ||
        normalizeLicenceKey(product.licence);

    if(productKey === licenceKey){
        return true;
    }

    return getLicenceGroup(licence)
        .some(groupLicence =>
            normalizeLicenceKey(groupLicence) === productKey
        );
}

function getProductSortLicence(product){

    if(
        routeLicenceFilter &&
        getLicenceGroup(routeLicenceFilter).length &&
        productMatchesLicence(product,routeLicenceFilter)
    ){
        return routeLicenceFilter;
    }

    return product.licence;
}

function licencesEquivalent(a,b){

    return productMatchesLicence(
        {
            licence:a,
            _licenceKey:normalizeLicenceKey(a)
        },
        b
    );
}

function getProductsForLicence(licence){

    const licenceKeys = [
        normalizeLicenceKey(licence),
        ...getLicenceGroup(licence)
            .map(normalizeLicenceKey)
    ].filter(Boolean);

    return licenceKeys.flatMap(
        licenceKey =>
            productsByLicenceKey.get(
                licenceKey
            ) || []
    );
}

function getLicenceRow(licence){

    const licenceKey =
        normalizeLicenceKey(licence);

    return (
        animeRowByLicenceKey.get(
            licenceKey
        ) ||
        null
    );
}

function isLicenceVisible(licence){

    const row =
        getLicenceRow(licence);

    return Boolean(
        row &&
        isLicenceInCurrentUniverse(row) &&
        (
            showAllLicencesSecretMode ||
            String(row[2] || "").trim() === "1"
        )
    );
}

function refreshAllTypes(){

    allTypes = [...new Set(
        allProducts
            .filter(product =>
                isLicenceVisible(product.licence)
            )
            .map(product => product.type)
            .filter(Boolean)
    )].sort();
}

function getPersosForLicence(licence){

    return [...new Set(
        getProductsForLicence(licence)
            .flatMap(p => p._persos || [])
            .filter(perso =>
                perso &&
                normalizeLicenceKey(perso) !== "divers"
            )
    )].sort();
}

function getLicenceAliases(row){

    const activationDateIndex =
        getLicenceActivationDateIndex();

    const universeIndex =
        getLicenceUniverseIndex();

    return [
        row[0],
        ...row
            .slice(3)
            .filter((value,index) =>
                index + 3 !== activationDateIndex &&
                index + 3 !== universeIndex
            )
            .flatMap(splitMultiValues)
    ].filter(Boolean);
}

function getRecentActiveLicences(){

    const dateIndex =
        getLicenceActivationDateIndex();

    if(dateIndex < 0){
        return [];
    }

    const dismissedKeys =
        new Set(
            loadDismissedNewLicences()
                .map(normalizeLicenceKey)
        );

    const now =
        new Date();

    const windowMs =
        NEW_LICENCE_WINDOW_DAYS *
        24 *
        60 *
        60 *
        1000;

    return animeData
        .filter(row =>
            row[0] &&
            isLicenceInCurrentUniverse(row) &&
            String(row[2] || "").trim() === "1"
        )
        .map(row => ({
            licence:row[0],
            date:parseLicenceActivationDate(row[dateIndex])
        }))
        .filter(item =>
            item.date &&
            now - item.date >= 0 &&
            now - item.date <= windowMs &&
            !dismissedKeys.has(
                normalizeLicenceKey(item.licence)
            )
        )
        .sort((a,b) =>
            b.date - a.date ||
            a.licence.localeCompare(
                b.licence,
                "fr",
                {sensitivity:"base"}
            )
        );
}

function showNewLicencesModal(){

    if(!shouldShowNewLicencesModal()){
        return;
    }

    const recentLicences =
        getRecentActiveLicences();

    if(!recentLicences.length){
        return;
    }

    let modal =
        document.getElementById(
            "newLicencesModal"
        );

    if(!modal){

        modal =
            document.createElement("div");

        modal.id = "newLicencesModal";

        document.body.appendChild(modal);
    }

    modal.className =
        `new-licences-modal ${
            recentLicences.length === 1
                ? "single"
                : recentLicences.length > 4
                    ? "many"
                    : ""
        }`;

    modal.innerHTML = `
        <div class="new-licences-dialog">
            <div class="new-licences-title-row">
                <h2>Nouvelles licences ajoutées</h2>

                <label class="new-licences-dismiss-all">
                    <input
                        type="checkbox"
                        onchange="toggleAllNewLicenceDismissals(this.checked)"
                    >
                    Tout cocher "Ne plus afficher"
                </label>
            </div>

            <div class="new-licences-grid">
                ${recentLicences.map(item => `
                    <div class="new-licence-item">
                        <a
                            href="/licence/${encodeURIComponent(slugLicence(item.licence))}"
                            class="new-licence-card"
                            data-licence="${encodeURIComponent(item.licence)}"
                            title="${escapeAttr(item.licence)}"
                            onclick="
                                event.preventDefault();
                                closeNewLicencesModal();
                                goToLicencePage(
                                    decodeURIComponent(
                                        this.dataset.licence
                                    )
                                );
                            "
                        >
                            <img
                                src="/images/Cards Licence/Thumbs/Card ${escapeAttr(item.licence)}.webp"
                                alt="${escapeAttr(item.licence)}"
                                loading="lazy"
                            >

                            <span>${escapeHtml(item.licence)}</span>
                        </a>

                        <label class="new-licence-dismiss">
                            <input
                                type="checkbox"
                                value="${escapeAttr(item.licence)}"
                            >
                            Ne plus afficher
                        </label>
                    </div>
                `).join("")}
            </div>

            <button
                type="button"
                class="new-licences-ok"
                onclick="closeNewLicencesModal()"
            >
                OK
            </button>
        </div>
    `;

    sessionStorage.setItem(
        NEW_LICENCES_SEEN_SESSION_KEY,
        "1"
    );

    modal.style.display = "flex";
}

function toggleAllNewLicenceDismissals(checked){

    const modal =
        document.getElementById(
            "newLicencesModal"
        );

    if(!modal){
        return;
    }

    modal
        .querySelectorAll(
            ".new-licence-dismiss input[type='checkbox']"
        )
        .forEach(input =>{
            input.checked = checked;
        });
}

function closeNewLicencesModal(){

    const modal =
        document.getElementById(
            "newLicencesModal"
        );

    if(!modal){
        return;
    }

    const checkedLicences =
        [
            ...modal.querySelectorAll(
                ".new-licence-dismiss input[type='checkbox']:checked"
            )
        ]
            .map(input => input.value)
            .filter(Boolean);

    if(checkedLicences.length){

        saveDismissedNewLicences([
            ...loadDismissedNewLicences(),
            ...checkedLicences
        ]);
    }

    modal.style.display = "none";
}

function findLicenceFromSearch(query){

    const queryKey =
        normalizeLicenceKey(query);

    if(!queryKey){
        return "";
    }

    const row =
        animeData.find(r =>
            isLicenceInCurrentUniverse(r) &&
            getLicenceAliases(r)
                .some(alias =>
                    normalizeLicenceKey(alias) === queryKey
                )
        );

    return row ? row[0] : "";
}

function findPersosFromSearch(query){

    const queryKey =
        normalizeLicenceKey(query);

    if(queryKey.length < 3){
        return [];
    }

    const persos =
        [...new Set(
            allProducts
                .filter(product =>
                    isLicenceVisible(product.licence)
                )
                .flatMap(p => p._persos || [])
                .filter(perso =>
                    perso &&
                    normalizeLicenceKey(perso) !== "divers"
                )
        )];

    const exactMatches =
        persos.filter(perso =>
            normalizeLicenceKey(perso) === queryKey
        );

    if(exactMatches.length){
        return exactMatches;
    }

    return persos.filter(perso =>
        normalizeLicenceKey(perso).includes(queryKey)
    );
}

function isHomeRoute(){

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        window.location.pathname === "/" &&
        !params.get("page") &&
        !params.get("licence")
    );
}

function showProductsLoadingMessage(){

    const grid =
        document.getElementById(
            "productGrid"
        );

    if(!grid){
        return;
    }

    grid.innerHTML = `
        <div class="loading-message">
            Chargement des produits...
        </div>
    `;
}

function showAmazonDisclosure(){

    if(!productsLoaded){
        return;
    }

    document
        .querySelectorAll(
            ".amazon-disclosure"
        )
        .forEach(disclosure =>
            disclosure.classList.add(
                "is-ready"
            )
        );
}

function prepareInitialProductRoute(){

    const path =
        window.location.pathname;

    const params =
        new URLSearchParams(
            window.location.search
        );

    const localLicence =
        params.get("licence");

    if(localLicence){
        routeLicenceFilter = localLicence;
        return;
    }

    if(path.startsWith("/licence/")){

        const slug =
            decodeURIComponent(path)
                .split("/licence/")[1]
                ?.toLowerCase();

        routeLicenceFilter =
            allAnime.find(licence =>
                slugLicence(licence) === slug
            ) || "";

        return;
    }

    routeLicenceFilter = "";
}

function renderInitialProductsBeforeMenus(){

    if(isHomeRoute()){
        return;
    }

    prepareInitialProductRoute();
    startSearch();
}

function ensureMenusBuilt(){

    if(
        menusBuilt ||
        menusBuilding ||
        !productsLoaded
    ){
        return;
    }

    menusBuilding = true;

    try{

        buildSidebar();
        buildTopMenus();

        menusBuilt = true;

    } finally {

        menusBuilding = false;
    }
}

function initLazyMenuBuildTriggers(){

    document
        .querySelectorAll(".menu-item")
        .forEach(item =>{

            if(item.dataset.lazyMenuReady === "1"){
                return;
            }

            item.dataset.lazyMenuReady = "1";

            item.addEventListener(
                "pointerenter",
                ensureMenusBuilt,
                {passive:true}
            );

            item.addEventListener(
                "pointerdown",
                ensureMenusBuilt,
                {passive:true}
            );

            item.addEventListener(
                "focusin",
                ensureMenusBuilt
            );
        });
}

function buildMenusAfterFirstProductPaint(){

    initLazyMenuBuildTriggers();

    if(isHomeRoute()){

        requestAnimationFrame(()=>{

            handleLicenceRoute();
            showAmazonDisclosure();
            updateFavoritesButton();

            console.timeEnd("TOTAL");
        });

        return;
    }

    const grid =
        document.getElementById(
            "productGrid"
        );

    const firstImages =
        [...(
            grid?.querySelectorAll(
                'img[fetchpriority="high"]'
            ) || []
        )];

    const waitForImage = image =>{

        if(image.complete){
            return Promise.resolve();
        }

        return new Promise(resolve =>{

            image.addEventListener(
                "load",
                resolve,
                {once:true}
            );

            image.addEventListener(
                "error",
                resolve,
                {once:true}
            );
        });
    };

    const firstImagesReady =
        firstImages.length
            ? Promise.all(
                firstImages.map(
                    waitForImage
                )
            )
            : Promise.resolve();

    Promise.race([
        firstImagesReady,
        new Promise(resolve =>
            setTimeout(resolve,3500)
        )
    ]).then(()=>{

        requestAnimationFrame(()=>{

            setTimeout(()=>{

                console.time("MENUS");

                ensureMenusBuilt();

                handleLicenceRoute();

                showAmazonDisclosure();

                updateFavoritesButton();

                console.timeEnd("MENUS");

                console.timeEnd("TOTAL");

            },150);
        });
    });
}

/* LOAD */

async function loadData(){

    ensureSortOptions();

    console.time("TOTAL");

    console.time("LICENCES_FETCH");

    const productsPromise =
        fetch(
            API_URL + "/api/all",
            {
                cache:"no-store"
            }
        );

    const animeRes =
        await fetch(animeSheetURL);

    console.timeEnd("LICENCES_FETCH");

    const animeText =
        await animeRes.text();

    const parsedAnimeData =
        parseCSV(animeText);

    animeHeaders =
        parsedAnimeData.shift() || [];

    animeData =
        parsedAnimeData;

    loadLicenceUniverseMode();

    rebuildAnimeIndexes();

    rebuildVisibleLicenceList();

    ensureUniverseSwitch();
    placeUniverseSwitchForViewport();

    placeFavoritesButtonForViewport();
    placeMobileHeaderControls();

    console.time("HOME_RENDER");

    buildLicenceCards();

    if(isHomeRoute()){
        handleLicenceRoute();
    }

    showNewLicencesModal();

    console.timeEnd("HOME_RENDER");

    console.time("PRODUCTS_FETCH");

    const productsRes =
        await productsPromise;

    console.timeEnd("PRODUCTS_FETCH");

    console.time("JSON");

    let products =
        await productsRes.json();

    if(!Array.isArray(products)){
        products = [];
    }

    if(products.length === 0){

        console.warn(
            "API produits vide, chargement direct depuis Google Sheets."
        );

        products =
            await loadProductsFromSheet();
    }

    allProducts =
        products
            .filter(product =>
                String(
                    product.actif ?? ""
                ).trim() === "1"
            )
            .map(
                prepareProduct
            );

    rebuildProductIndexes();

    productsLoaded = true;

    console.timeEnd("JSON");

    refreshAllTypes();

    renderInitialProductsBeforeMenus();

    buildMenusAfterFirstProductPaint();
}

/* SIDEBAR */

function buildSidebar(){

    const typeList =
        document.getElementById("typeList");

    const licenceList =
        document.getElementById("licenceList");

    typeList.innerHTML =
        allTypes.map(type => `
            <label>

                <input
                    type="checkbox"
                    value="${type}"
                    onchange="startSearch()"
                >

                <span class="filter-label-text">${type}</span>

            </label>
        `).join("");

    const sortedLicences =
        getSortedLicences();

    const renderLicenceBlock = (licence,isFavorite = false)=>{

        const persos =
            getPersosForLicence(licence);

        const persosHTML =
            persos.map(perso => `

                <label>

                    <input
                        type="checkbox"
                        class="perso-checkbox"
                        data-licence="${licence}"
                        value="${perso}"
                        onchange="startSearch()"
                    >

                    ${perso}

                </label>
            `).join("");

        return `

            <div class="licence-block ${isFavorite ? "favorite-licence-block" : ""}">

                <label>

                    <input
                        type="checkbox"
                        class="licence-checkbox"
                        value="${licence}"

                        onchange="
    handleSidebarLicenceChange(this);
"
                    >

                    ${licence}

                </label>

                <div class="perso-list">

                    ${persosHTML}

                </div>

            </div>
        `;
    };

    const priorityHTML =
        sortedLicences.priority.length
            ? `
                <div class="favorite-licence-section">
                    ${sortedLicences.priority
                        .map(licence =>
                            renderLicenceBlock(
                                licence,
                                true
                            )
                        )
                        .join("")}
                </div>

                <div class="licence-list-separator"></div>
            `
            : "";

    licenceList.innerHTML =
        priorityHTML +
        sortedLicences.all
            .map(licence =>
                renderLicenceBlock(licence)
            )
            .join("");
}

/* SHOW HIDE PERSOS */

function toggleSidebarSection(contentId,toggleId){

    ensureMenusBuilt();

    const content =
        document.getElementById(contentId);

    const toggle =
        document.getElementById(toggleId);

    const isOpen =
        content.style.display === "block";

    if(isOpen){

        content.style.display = "none";

        toggle.textContent = "+";

    } else {

        content.style.display = "block";

        toggle.textContent = "−";
    }
}

function togglePersos(checkbox){

    const persoList =

        checkbox
        .closest(".licence-block")
        .querySelector(".perso-list");

    if(checkbox.checked){

        persoList.style.display = "block";

        setTimeout(()=>{

            checkbox
                .closest(".licence-block")
                .scrollIntoView({

                    behavior:"smooth",

                    block:"start"
                });

        },150);

    } else {

        persoList.style.display = "none";

        persoList
            .querySelectorAll("input")
            .forEach(i => i.checked = false);
    }
}

function handleSidebarLicenceChange(checkbox){

    togglePersos(checkbox);

    routeLicenceFilter = "";

    history.replaceState(
        null,
        "",
        window.location.hostname === "127.0.0.1"
            ? "/?page=catalogue"
            : "/catalogue"
    );

    updateSidebarPromoCard("catalogue");

    document
        .getElementById("licenceCardsGrid")
        .style.display = "none";

    document
        .getElementById("productGrid")
        .style.display = "grid";

    startSearch();
}

/* LICENCE CARDS */

const mobileLicenceCardPathCache =
    new Map();

const MOBILE_LICENCE_CARD_ALIASES =
    new Map([
        [
            normalizeLicenceKey(
                "Bastard!! Heavy Metal, Dark Fantasy"
            ),
            "Bastard"
        ]
    ]);

function probeLicenceCardImage(path){

    return new Promise(resolve =>{

        const probe =
            new Image();

        probe.onload = () =>
            resolve(path);

        probe.onerror = () =>
            resolve("");

        probe.src = path;
    });
}

async function getMobileLicenceCardPath(
    licence
){

    const key =
        normalizeLicenceKey(licence);

    if(
        mobileLicenceCardPathCache.has(
            key
        )
    ){
        return mobileLicenceCardPathCache.get(
            key
        );
    }

    const fileNames = [
        licence,
        MOBILE_LICENCE_CARD_ALIASES.get(
            key
        )
    ].filter(Boolean);

    const extensions =
        ["png","webp","jpg","jpeg"];

    const candidates = [
        ...new Set(
            fileNames.flatMap(fileName =>
                extensions.map(extension =>
                    `/images/Cards Licence/Mobile/Card ${fileName} mobile.${extension}`
                )
            )
        )
    ];

    for(const candidate of candidates){

        const availablePath =
            await probeLicenceCardImage(
                candidate
            );

        if(availablePath){
            mobileLicenceCardPathCache.set(
                key,
                availablePath
            );

            return availablePath;
        }
    }

    mobileLicenceCardPathCache.set(
        key,
        ""
    );

    return "";
}

async function expandLicenceCard(
    event,
    element
){

    event.preventDefault();

    event.stopPropagation();

    const desktopImage =
        decodeURIComponent(
            element.dataset.image
        );

    if(
        !window.matchMedia(
            "(max-width: 768px)"
        ).matches
    ){
        openModal(
            desktopImage,
            true
        );

        return false;
    }

    const licence =
        decodeURIComponent(
            element.dataset.licence || ""
        );

    const mobileImage =
        licence
            ? await getMobileLicenceCardPath(
                licence
            )
            : "";

    openModal(
        mobileImage || desktopImage,
        true
    );

    return false;
}

function toggleLicenceCardsSize(){

    const grid =
        document.getElementById(
            "licenceCardsGrid"
        );

    if(!grid){
        return;
    }

    grid.classList.toggle("compact");
}

function isUserLicenceFavorite(licence){

    const key =
        normalizeLicenceKey(licence);

    return userLicenceFavorites.some(
        favorite =>
            normalizeLicenceKey(favorite) === key
    );
}

function saveUserLicenceFavorites(){

    localStorage.setItem(
        USER_LICENCE_FAVORITES_KEY,
        JSON.stringify(userLicenceFavorites)
    );
}

function refreshUserLicenceFavoriteControls(licence){

    const favorite =
        isUserLicenceFavorite(licence);

    document
        .querySelectorAll(
            ".licence-card-user-favorite"
        )
        .forEach(control =>{

            const controlLicence =
                decodeURIComponent(
                    control.dataset.licence || ""
                );

            if(
                normalizeLicenceKey(controlLicence) !==
                normalizeLicenceKey(licence)
            ){
                return;
            }

            control.classList.toggle(
                "active",
                favorite
            );

            control.setAttribute(
                "aria-label",
                `${favorite ? "Retirer" : "Ajouter"} ${licence} des licences favorites`
            );

            control.title =
                favorite
                    ? "Retirer des favoris"
                    : "Ajouter aux favoris";
        });
}

function updateUserFeaturedLicenceCard(
    licence,
    sourceCard
){

    const userFeaturedGrid =
        document.getElementById(
            "userFeaturedLicenceCardsGrid"
        );

    if(!userFeaturedGrid){
        return;
    }

    userFeaturedGrid
        .querySelectorAll(
            ".licence-card"
        )
        .forEach(card =>{

            const cardLicence =
                decodeURIComponent(
                    card
                        .querySelector(
                            ".licence-card-user-favorite"
                        )
                        ?.dataset
                        .licence || ""
                );

            if(
                normalizeLicenceKey(cardLicence) ===
                normalizeLicenceKey(licence)
            ){
                card.remove();
            }
        });

    if(
        isUserLicenceFavorite(licence) &&
        sourceCard
    ){

        const miniCard =
            sourceCard.cloneNode(true);

        miniCard.classList.add(
            "featured-licence-card",
            "user-featured-licence-card"
        );

        userFeaturedGrid.appendChild(
            miniCard
        );
    }

    userFeaturedGrid.style.display =
        userFeaturedGrid.childElementCount
            ? "grid"
            : "none";
}

function toggleUserLicenceFavorite(event,element){

    event.preventDefault();
    event.stopPropagation();

    const licence =
        decodeURIComponent(
            element.dataset.licence || ""
        );

    if(!licence){
        return false;
    }

    const key =
        normalizeLicenceKey(licence);

    if(isUserLicenceFavorite(licence)){

        userLicenceFavorites =
            userLicenceFavorites.filter(
                favorite =>
                    normalizeLicenceKey(favorite) !== key
            );

    } else {

        userLicenceFavorites.push(licence);
    }

    saveUserLicenceFavorites();
    refreshUserLicenceFavoriteControls(
        licence
    );
    updateUserFeaturedLicenceCard(
        licence,
        element.closest(".licence-card")
    );

    return false;
}

function buildLicenceCards(){

    const renderGeneration =
        ++licenceCardsRenderGeneration;

    const grid =
        document.getElementById(
            "licenceCardsGrid"
        );

    const featuredGrid =
        document.getElementById(
            "featuredLicenceCardsGrid"
        );

    let userFeaturedGrid =
        document.getElementById(
            "userFeaturedLicenceCardsGrid"
        );

    if(!grid){
        return;
    }

    if(!userFeaturedGrid){

        userFeaturedGrid =
            document.createElement("div");

        userFeaturedGrid.id =
            "userFeaturedLicenceCardsGrid";

        userFeaturedGrid.className =
            "featured-licence-cards-grid user-featured-licence-cards-grid";

        featuredGrid
            ?.insertAdjacentElement(
                "afterend",
                userFeaturedGrid
            );
    }

    const licenceRows = animeData

        .filter(r =>
            r[0] &&
            isLicenceInCurrentUniverse(r) &&
            (
                showAllLicencesSecretMode ||
                r[2] == "1"
            )
        );

    const sortedLicenceRows =
        [...licenceRows]
            .sort((a,b)=>
                a[0].localeCompare(
                    b[0],
                    'fr',
                    {sensitivity:'base'}
                )
            );

    const showLicenceFavorites =
        licenceFavoritesEnabled();

    const licences =
        sortedLicenceRows
            .map(r => r[0]);

    const featuredLicences =
        showLicenceFavorites
            ? licenceRows
            .filter(r =>{

                const fav =
                    Number(r[1]);

                return fav >= 1;
            })
            .sort((a,b)=>{

                const favA =
                    Number(a[1]) || 9999;

                const favB =
                    Number(b[1]) || 9999;

                if(favA !== favB){
                    return favA - favB;
                }

                return a[0].localeCompare(
                    b[0],
                    'fr',
                    {sensitivity:'base'}
                );
            })
            .map(r => r[0])
            : [];

    const availableLicenceByKey =
        new Map(
            licenceRows.map(row =>[
                normalizeLicenceKey(row[0]),
                row[0]
            ])
        );

    const userFeaturedLicences =
        showLicenceFavorites
            ? userLicenceFavorites
            .map(licence =>
                availableLicenceByKey.get(
                    normalizeLicenceKey(licence)
                )
            )
            .filter(Boolean)
            : [];

    const buildCardHTML = (
        licence,
        index,
        extraClass = "",
        showFavoriteControl = false
    ) => `

            <a
                href="/?licence=${encodeURIComponent(licence)}"
                class="licence-card ${extraClass} ${showFavoriteControl ? "has-user-favorite-control" : ""}"
                title="${escapeAttr(licence)}"
            >

                <img
                    src="/images/Cards Licence/Thumbs/Card ${licence}.webp"
                    alt="${escapeAttr(licence)}"
                    loading="${index < 12 ? "eager" : "lazy"}"
                    fetchpriority="${index < 8 ? "high" : "auto"}"
                >

                <div class="licence-card-title">
                    ${escapeHtml(licence)}
                </div>

                ${
                    showFavoriteControl
                    ? `
                        <span
                            class="licence-card-user-favorite ${isUserLicenceFavorite(licence) ? "active" : ""}"
                            data-licence="${encodeURIComponent(licence)}"
                            role="button"
                            tabindex="0"
                            aria-label="${isUserLicenceFavorite(licence) ? "Retirer" : "Ajouter"} ${escapeAttr(licence)} des licences favorites"
                            title="${isUserLicenceFavorite(licence) ? "Retirer des favoris" : "Ajouter aux favoris"}"
                            onclick="return toggleUserLicenceFavorite(event,this);"
                            onkeydown="if(event.key === 'Enter' || event.key === ' '){ return toggleUserLicenceFavorite(event,this); }"
                        ></span>
                    `
                    : ""
                }

                <span
                    class="licence-card-expand"
                    data-image="${encodeURIComponent(`/images/Cards Licence/Card ${licence}.webp`)}"
                    data-licence="${encodeURIComponent(licence)}"
                    onclick="return expandLicenceCard(event,this);"
                >
                    &#128269;
                </span>

            </a>
        `;

    if(featuredGrid){

        featuredGrid.innerHTML =
            featuredLicences
                .map((licence,index)=>
                    buildCardHTML(
                        licence,
                        index,
                        "featured-licence-card"
                    )
                )
                .join("");
    }

    if(userFeaturedGrid){

        userFeaturedGrid.innerHTML =
            userFeaturedLicences
                .map((licence,index)=>
                    buildCardHTML(
                        licence,
                        index,
                        "featured-licence-card user-featured-licence-card",
                        true
                    )
                )
                .join("");

        userFeaturedGrid.style.display =
            userFeaturedLicences.length &&
            grid.style.display !== "none"
                ? "grid"
                : "none";
    }

    const firstBatchSize = 12;
    const chunkSize = 12;

    const buildCardsHTML = (start,end)=>
        licences
            .slice(start,end)
            .map((licence,index)=>
                buildCardHTML(
                    licence,
                    start + index,
                    "",
                    showLicenceFavorites
                )
            )
            .join("");

    grid.innerHTML =
        buildCardsHTML(
            0,
            firstBatchSize
        );

    let nextIndex = firstBatchSize;

    const appendNextChunk = ()=>{

        if(
            renderGeneration !==
                licenceCardsRenderGeneration ||
            nextIndex >= licences.length
        ){
            return;
        }

        const html =
            buildCardsHTML(
                nextIndex,
                nextIndex + chunkSize
            );

        grid.insertAdjacentHTML(
            "beforeend",
            html
        );

        nextIndex += chunkSize;

        scheduleNextChunk();
    };

    const scheduleNextChunk = ()=>{

        if(
            renderGeneration !==
            licenceCardsRenderGeneration
        ){
            return;
        }

        setTimeout(
            appendNextChunk,
            180
        );
    };

    scheduleNextChunk();
}

/* TOP MENUS */

function setRefineTopType(type){

    refineTopType =
        refineTopType === type
            ? ""
            : type;

    startSearch();
    closeTopMenus();
    closeTopMenusOnMobile();
}

function setRefineTopPerso(perso){

    refineTopPerso =
        refineTopPerso === perso
            ? ""
            : perso;

    startSearch();
    closeTopMenus();
    closeTopMenusOnMobile();
}

function updateRefinementMenus(
    contextProducts = [],
    allowPersonOptions = true
){

    const typesDropdown =
        document.getElementById(
            "refineTypesDropdown"
        );

    const persosDropdown =
        document.getElementById(
            "refinePersosDropdown"
        );

    const typeLabel =
        document.getElementById(
            "refineTypeLabel"
        );

    const persoLabel =
        document.getElementById(
            "refinePersoLabel"
        );

    if(
        !typesDropdown ||
        !persosDropdown
    ){
        return;
    }

    const productsForTypes =
        refineTopPerso
            ? contextProducts.filter(product =>
                product._persoKeys.has(
                    normalizeLicenceKey(
                        refineTopPerso
                    )
                )
            )
            : contextProducts;

    const productsForPersos =
        refineTopType
            ? contextProducts.filter(product =>
                product.type ===
                refineTopType
            )
            : contextProducts;

    const availableTypes =
        [
            ...new Set(
                productsForTypes
                    .map(product => product.type)
                    .filter(Boolean)
            )
        ].sort(compareText);

    const availablePersos =
        allowPersonOptions
            ? [
                ...new Set(
                    productsForPersos
                        .flatMap(product =>
                            product._persos || []
                        )
                        .filter(perso =>
                            perso &&
                            normalizeLicenceKey(perso) !==
                                "divers"
                        )
                )
            ].sort(compareText)
            : [];

    const renderEmptyState = label => `
        <div class="refine-dropdown-empty">
            Aucun ${label} compatible
        </div>
    `;

    typesDropdown.innerHTML = `
        <div class="dropdown-scroll">
            <div
                class="dropdown-item refine-dropdown-reset ${
                    refineTopType
                        ? ""
                        : "active"
                }"
                onclick="setRefineTopType('')"
            >
                Tous les types compatibles
            </div>

            ${
                availableTypes.length
                    ? availableTypes
                        .map(type => `
                            <div
                                class="dropdown-item refine-dropdown-choice ${
                                    refineTopType === type
                                        ? "active"
                                        : ""
                                }"
                                data-value="${encodeURIComponent(type)}"
                                onclick="
                                    setRefineTopType(
                                        decodeURIComponent(
                                            this.dataset.value
                                        )
                                    )
                                "
                            >
                                ${escapeHtml(type)}
                            </div>
                        `)
                        .join("")
                    : renderEmptyState("type")
            }
        </div>
    `;

    persosDropdown.innerHTML = `
        <div class="dropdown-scroll">
            <div
                class="dropdown-item refine-dropdown-reset ${
                    refineTopPerso
                        ? ""
                        : "active"
                }"
                onclick="setRefineTopPerso('')"
            >
                Tous les personnages compatibles
            </div>

            ${
                availablePersos.length
                    ? availablePersos
                        .map(perso => `
                            <div
                                class="dropdown-item refine-dropdown-choice ${
                                    refineTopPerso === perso
                                        ? "active"
                                        : ""
                                }"
                                data-value="${encodeURIComponent(perso)}"
                                onclick="
                                    setRefineTopPerso(
                                        decodeURIComponent(
                                            this.dataset.value
                                        )
                                    )
                                "
                            >
                                ${escapeHtml(perso)}
                            </div>
                        `)
                        .join("")
                    : (
                        allowPersonOptions
                            ? renderEmptyState(
                                "personnage"
                            )
                            : `
                                <div class="refine-dropdown-empty">
                                    Lancez d'abord une recherche ou choisissez une licence
                                </div>
                            `
                    )
            }
        </div>
    `;

    if(typeLabel){

        typeLabel.textContent =
            refineTopType ||
            "Type";

        typeLabel.title =
            refineTopType || "";
    }

    if(persoLabel){

        if(refineTopPerso){

            persoLabel.textContent =
                refineTopPerso;

        } else {

            persoLabel.innerHTML = `
                <span class="refine-perso-label-desktop">
                    Personnage
                </span>
                <span class="refine-perso-label-mobile">
                    Persos
                </span>
            `;
        }

        persoLabel.title =
            refineTopPerso || "";
    }

    typesDropdown
        .closest(".menu-item")
        ?.classList.toggle(
            "active",
            Boolean(refineTopType)
        );

    persosDropdown
        .closest(".menu-item")
        ?.classList.toggle(
            "active",
            Boolean(refineTopPerso)
        );
}

function scheduleRefinementMenusUpdate(
    contextProducts,
    allowPersonOptions
){

    const renderGeneration =
        ++refinementMenusRenderGeneration;

    requestAnimationFrame(()=>{

        if(
            renderGeneration !==
            refinementMenusRenderGeneration
        ){
            return;
        }

        updateRefinementMenus(
            contextProducts,
            allowPersonOptions
        );
    });
}

function getTopMenuPinnedLicence(){

    if(routeLicenceFilter){
        return routeLicenceFilter;
    }

    const selectedLicences =
        [
            ...document.querySelectorAll(
                '.licence-checkbox:checked'
            )
        ]
            .map(input => input.value)
            .filter(Boolean);

    return selectedLicences.length === 1
        ? selectedLicences[0]
        : "";
}

function refreshTopMenusPinnedLicence(){

    if(
        !menusBuilt ||
        menusBuilding ||
        !productsLoaded
    ){
        return;
    }

    const nextPinnedLicenceKey =
        normalizeLicenceKey(
            getTopMenuPinnedLicence()
        );

    if(nextPinnedLicenceKey === topMenusPinnedLicenceKey){
        return;
    }

    buildTopMenus();
}

function buildTopMenus(){

    const typesDropdown =
        document.getElementById("typesDropdown");

    const licencesDropdown =
        document.getElementById("licencesDropdown");

    const licencesByType = new Map();
    const persosByLicence = new Map();
    const pinnedLicence =
        getTopMenuPinnedLicence();
    const pinnedLicenceKey =
        normalizeLicenceKey(pinnedLicence);

    topMenusPinnedLicenceKey =
        pinnedLicenceKey;

    allProducts.forEach(product=>{

        if(!isLicenceVisible(product.licence)){
            return;
        }

        if(product.type && product.licence){

            if(!licencesByType.has(product.type)){
                licencesByType.set(product.type,new Set());
            }

            licencesByType
                .get(product.type)
                .add(product.licence);
        }

        const productPersos =
            (product._persos || [])
                .filter(perso =>
                    normalizeLicenceKey(perso) !== "divers"
                );

        if(
            product.licence &&
            productPersos.length
        ){

            if(!persosByLicence.has(product.licence)){
                persosByLicence.set(product.licence,new Set());
            }

            productPersos.forEach(perso=>{

                persosByLicence
                    .get(product.licence)
                    .add(perso);
            });
        }
    });

    animeData
        .filter(row =>
            row[0] &&
            isLicenceInCurrentUniverse(row) &&
            (showAllLicencesSecretMode || row[2] == "1") &&
            getLicenceGroup(row[0]).length
        )
        .forEach(row=>{

            const aggregateLicence = row[0];

            getProductsForLicence(aggregateLicence)
                .forEach(product=>{

                    if(product.type){

                        if(!licencesByType.has(product.type)){
                            licencesByType.set(product.type,new Set());
                        }

                        licencesByType
                            .get(product.type)
                            .add(aggregateLicence);
                    }

                    const productPersos =
                        (product._persos || [])
                            .filter(perso =>
                                normalizeLicenceKey(perso) !== "divers"
                            );

                    if(productPersos.length){

                        if(!persosByLicence.has(aggregateLicence)){
                            persosByLicence.set(aggregateLicence,new Set());
                        }

                        productPersos.forEach(perso=>{

                            persosByLicence
                                .get(aggregateLicence)
                                .add(perso);
                        });
                    }
                });
        });

    const typesHTML =
        allTypes.map(type=>{

        const licences = [
            ...(licencesByType.get(type) || [])
        ].sort();

        const pinnedTypeLicence =
            pinnedLicenceKey
                ? licences.find(licence =>
                    normalizeLicenceKey(licence) ===
                    pinnedLicenceKey
                ) || ""
                : "";

        const licencesForTypeSubmenu =
            pinnedTypeLicence
                ? [
                    pinnedTypeLicence,
                    ...licences
                ]
                : licences;

        const submenu = `
            <div
                class="dropdown-item"
                data-type="${encodeURIComponent(type)}"
                onclick="
                    quickType(
                        decodeURIComponent(
                            this.dataset.type
                        )
                    );
                    closeTopMenusOnMobile();
                "
            >
                Toutes les licences
            </div>
            ${licencesForTypeSubmenu.map((licence,index) => `
                <div
                    class="dropdown-item ${
                        pinnedTypeLicence &&
                        index === 0
                            ? "pinned-type-licence"
                            : ""
                    }"

                    data-type="${encodeURIComponent(type)}"

                    data-licence="${encodeURIComponent(licence)}"

                    onclick="

                        resetAllFiltersForTopDropdown();

                        quickTopType =
                            decodeURIComponent(
                                this.dataset.type
                            );

                        document
                            .querySelectorAll(
                                '.licence-checkbox'
                            )
                            .forEach(i=>{

                                if(
                                    normalizeLicenceKey(i.value) ===
                                    normalizeLicenceKey(
                                        decodeURIComponent(
                                            this.dataset.licence
                                        )
                                    )
                                ){
                                    i.checked = true;
                                }
                            });

                        startSearch();

                        closeTopMenusOnMobile();
                    "
                >
                    ${licence}
                </div>
            `).join("")}
        `;

        return `

            <div
                class="dropdown-item"
                data-type="${encodeURIComponent(type)}"
                onclick="
                    if(event.target.closest('.submenu')){
                        return;
                    }

                    if(openMobileTopSubmenu(event,this)){
                        return;
                    }

                    quickType(
                        decodeURIComponent(
                            this.dataset.type
                        )
                    )
                "
            >

                    <div class="has-submenu">

        <span
            class="top-parent-link"
            data-type="${encodeURIComponent(type)}"
        >
            ${type}
        </span>

        <span class="submenu-arrow"></span>

    </div>

                <div class="submenu">

                    ${submenu}

                </div>

            </div>
        `;
    }).join("");

    typesDropdown.innerHTML = `
        <div class="dropdown-scroll">
            ${typesHTML}
        </div>
    `;

    const sortedLicences =
        getSortedLicences();

    const renderTopLicenceItem = (licence,isFavorite = false)=>{

        const persos =
            getPersosForLicence(licence);

        const submenu = `
            <div
                class="dropdown-item ${isFavorite ? "favorite-dropdown-item" : ""}"
                data-licence="${encodeURIComponent(licence)}"
                onclick="
                    quickLicence(
                        decodeURIComponent(
                            this.dataset.licence
                        )
                    );
                    closeTopMenusOnMobile();
                "
            >
                Tous les personnages
            </div>
            ${persos.map(perso => `
                <div
                    class="dropdown-item"
                    data-licence="${encodeURIComponent(licence)}"
                    data-perso="${encodeURIComponent(perso)}"

                    onclick="quickPerso(
                        decodeURIComponent(
                            this.dataset.licence
                        ),
                        decodeURIComponent(
                            this.dataset.perso
                        )
                    );
                    closeTopMenusOnMobile();
                    "
                >
                    <span class="filter-label-text">${perso}</span>
                </div>
            `).join("")}
        `;

        return `

            <div
                class="dropdown-item"
                data-licence="${encodeURIComponent(licence)}"
                onclick="
                    if(event.target.closest('.submenu')){
                        return;
                    }

                    if(openMobileTopSubmenu(event,this)){
                        return;
                    }

                    quickLicence(
                        decodeURIComponent(
                            this.dataset.licence
                        )
                    )
                "
            >

                <div class="has-submenu">

                    <span
                        class="top-parent-link"
                        data-licence="${encodeURIComponent(licence)}"
                    >
                    <span class="filter-label-text">${licence}</span>
                    </span>

                    <span class="submenu-arrow"></span>

                </div>

                <div class="submenu">

                    ${submenu}

                </div>

            </div>
        `;
    };

    const priorityLicencesHTML =
        sortedLicences.priority.length
            ? `
                <div class="favorite-dropdown-section">
                    ${sortedLicences.priority
                        .map(licence =>
                            renderTopLicenceItem(
                                licence,
                                true
                            )
                        )
                        .join("")}
                </div>

                <div class="licence-separator"></div>
            `
            : "";

    const licencesHTML =
        priorityLicencesHTML +
        sortedLicences.all
            .map(licence =>
                renderTopLicenceItem(licence)
            )
            .join("");

    licencesDropdown.innerHTML = `
        <div class="dropdown-scroll">
            ${licencesHTML}
        </div>
    `;
}

function closeTopMenus(){

    if(isMobileTopMenu()){
        closeTopMenusOnMobile();
        return;
    }

    document
        .querySelectorAll('.dropdown')
        .forEach(d => {

            d.style.display = 'none';
        });

    setTimeout(()=>{

        document
            .querySelectorAll('.dropdown')
            .forEach(d => {

                d.style.display = '';
            });

    },200);
}

function closeTopMenusOnMobile(){

    if(window.innerWidth > 768){
        return;
    }

    document
        .querySelectorAll(".submenu-open")
        .forEach(el=>{
            el.classList.remove("submenu-open");
        });

    openSubmenuItem = null;

    clearTimeout(submenuCloseTimeout);

    document
        .querySelectorAll(".dropdown")
        .forEach(dropdown=>{
            dropdown.style.display = "none";
        });
}

function getSortedLicences(){

    const licencesMap = new Map();
    const licenceKeys = new Set();

    animeData
        .filter(row =>
            row[0] &&
            isLicenceInCurrentUniverse(row) &&
            (
                showAllLicencesSecretMode ||
                row[2] == "1"
            )
        )
        .forEach(row=>{

            licencesMap.set(
                row[0],
                {
                    name:row[0],
                    priority:licenceFavoritesEnabled()
                        ? Number(row[1]) || 999999
                        : 999999
                }
            );

            licenceKeys.add(
                normalizeLicenceKey(row[0])
            );
        });

    allProducts.forEach(p=>{

        if(
            !p.licence ||
            !isLicenceVisible(p.licence)
        ){
            return;
        }

        const productLicenceKey =
            p._licenceKey ||
            normalizeLicenceKey(p.licence);

        if(licenceKeys.has(productLicenceKey)){
            return;
        }

        const animeRow =
            getLicenceRow(p.licence);

const priority =

    licenceFavoritesEnabled() &&
    animeRow &&
    animeRow[1]

    ? parseInt(animeRow[1])

    : 999999;

            licencesMap.set(
                p.licence,
                {
                    name:p.licence,
                    priority
                }
            );

            licenceKeys.add(
                productLicenceKey
            );
    });

    const priorityLicences =

        [...licencesMap.values()]

        .filter(l => l.priority !== 999999)

        .sort((a,b)=>{

            if(a.priority !== b.priority){
                return a.priority - b.priority;
            }

            return a.name.localeCompare(
                b.name,
                'fr',
                {sensitivity:'base'}
            );
        });

    const alphabeticalLicences =

    [...licencesMap.values()]

    .sort((a,b)=>

            a.name.localeCompare(
                b.name,
                'fr',
                {sensitivity:'base'}
            )
        );

    return {

    priority:
        priorityLicences.map(l=>l.name),

    alphabetical:
        alphabeticalLicences
            .filter(l => l.priority === 999999)
            .map(l=>l.name),

    all:
        alphabeticalLicences.map(l=>l.name)
};
}

function normalizeText(text){

    return text

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g,"")

        .replace(/[’']/g,"'")

        .trim()

        .toLowerCase();
}

function normalizeLicenceKey(text){

    return normalizeText(text)
        .replace(/[^a-z0-9]/g,"");
}

function compareText(a,b){

    return String(a || "").localeCompare(
        String(b || ""),
        "fr",
        {sensitivity:"base"}
    );
}

function firstPersoName(product){

    return (
        product._persos &&
        product._persos.length
    )
        ? product._persos[0]
        : "";
}

function ensureSortOptions(){

    const sortSelect =
        document.getElementById("sortSelect");

    if(!sortSelect){
        return;
    }

    const expectedOptions = [
        ["random","Al&eacute;atoire"],
        ["price-asc","Prix croissant"],
        ["price-desc","Prix d&eacute;croissant"],
        ["licence-asc","Licence A &rarr; Z"],
        ["licence-desc","Licence Z &rarr; A"],
        ["type-asc","Type A &rarr; Z"],
        ["type-desc","Type Z &rarr; A"],
        ["perso-asc","Personnage A &rarr; Z"],
        ["perso-desc","Personnage Z &rarr; A"]
    ];

    const currentValue =
        sortSelect.value || "random";

    sortSelect.innerHTML =
        expectedOptions
            .map(([value,label]) => `
                <option value="${value}">
                    ${label}
                </option>
            `)
            .join("");

    sortSelect.value =
        expectedOptions.some(([value]) => value === currentValue)
            ? currentValue
            : "random";

    sortSelect.onchange = handleSortChange;
}

function handleSortChange(){

    userSelectedSort = true;

    startSearch();
}

function hasActiveProductContext(){

    const searchInput =
        document.getElementById("searchInput");

    const searchText =
        searchInput
            ? searchInput.value.trim()
            : "";

    const hasSidebarFilter =
        Boolean(
            document.querySelector("#typeList input:checked") ||
            document.querySelector(".licence-checkbox:checked") ||
            document.querySelector(".perso-checkbox:checked")
        );

    const minPrice =
        Number(minSlider?.value || 1);

    const maxPrice =
        Number(maxSlider?.value || DEFAULT_MAX_PRICE);

    const hasPriceFilter =
        minPrice !== 1 ||
        maxPrice !== DEFAULT_MAX_PRICE;

    return Boolean(
        routeLicenceFilter ||
        quickTopType ||
        refineTopType ||
        refineTopPerso ||
        searchText ||
        waifuMode ||
        favoritesMode ||
        hasSidebarFilter ||
        hasPriceFilter
    );
}

function syncDefaultSortForContext(){

    if(userSelectedSort){
        return;
    }

    const sortSelect =
        document.getElementById("sortSelect");

    if(!sortSelect){
        return;
    }

    sortSelect.value =
        hasActiveProductContext()
            ? "perso-asc"
            : "random";
}

/* QUICK FILTERS */

const SEARCH_INPUT_DELAY = 250;
let searchInputTimer = null;

function cancelPendingSearchInput(){

    if(searchInputTimer !== null){
        clearTimeout(searchInputTimer);
        searchInputTimer = null;
    }
}

function clearMainFilters({ preserveSearch = false } = {}){

    document
        .querySelectorAll(
            '#typeList input:checked'
        )
        .forEach(i => i.checked = false);

    document
        .querySelectorAll(
            '.perso-checkbox:checked'
        )
        .forEach(i => i.checked = false);

    document
        .querySelectorAll(
            '.licence-checkbox:checked'
        )
        .forEach(i => {
            i.checked = false;
            togglePersos(i);
        });

    if(!preserveSearch){
        cancelPendingSearchInput();

        const searchInput =
            document.getElementById('searchInput');

        if(searchInput){
            searchInput.value = "";
        }

        refineTopType = "";
        refineTopPerso = "";
    }

    quickTopType = "";
}

function resetAllFiltersForTopDropdown(){

    clearMainFilters();

    waifuMode = false;

    const button =
        document.getElementById(
            'waifuButton'
        );

    if(button){
        button.classList.remove('active');
        button.textContent = 'Mode Waifu';
    }

    button.textContent =
        'Mode Waifu';

    quickBudgetCheckboxes.forEach(b=>{

        document.getElementById(
            b.id
        ).checked = false;
    });

    minSlider.value = 1;
    maxSlider.value = DEFAULT_MAX_PRICE;

    updatePriceDisplay();

    if(button){
        button.textContent = 'Mode Waifu';
    }

    favoritesMode = false;
    updateFavoritesButton();

    routeLicenceFilter = "";
}

function clearAllFilters(){

    const params =
        new URLSearchParams(
            window.location.search
        );

    if(
        window.location.pathname.startsWith("/licence/") ||
        params.get("licence")
    ){
        window.location.href =
            window.location.hostname === "127.0.0.1"

            ? "/?page=catalogue"

            : "/catalogue";

        return;
    }

    clearMainFilters();

    waifuMode = false;

    const button =
        document.getElementById(
            'waifuButton'
        );

    button.classList.remove('active');

    button.textContent =
        'Mode Waifu';

    quickBudgetCheckboxes.forEach(b=>{

    document.getElementById(
        b.id
    ).checked = false;
    });

    minSlider.value = 1;

    maxSlider.value = DEFAULT_MAX_PRICE;

    updatePriceDisplay();

    favoritesMode = false;

    updateFavoritesButton();

    startSearch();
}

function handleSearchInput(event){

    if(event?.isComposing){
        return;
    }

    const searchInput =
        event?.currentTarget ||
        document.getElementById('searchInput');

    if(!searchInput){
        return;
    }

    // Ne jamais réécrire la valeur pendant la saisie : les claviers mobiles
    // composent eux-mêmes le mot et rejoueraient sinon ses préfixes.
    clearMainFilters({ preserveSearch: true });
    cancelPendingSearchInput();

    searchInputTimer = setTimeout(()=>{
        searchInputTimer = null;
        startSearch();
    },SEARCH_INPUT_DELAY);
}

function quickType(type){

    resetAllFiltersForTopDropdown();

    quickTopType = type;

    startSearch();

    closeTopMenus();

}

function goToLicencePage(licence){

    const slug =
        slugLicence(licence);

    const isLocalHost =
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost" ||
        window.location.protocol === "file:";

    const hasStaticLicencePage =
        allAnime.some(l =>
            normalizeLicenceKey(l) ===
            normalizeLicenceKey(licence)
        );

    window.location.href =
        isLocalHost ||
        !hasStaticLicencePage

        ? `/?licence=${encodeURIComponent(licence)}`

        : `/licence/${encodeURIComponent(slug)}`;
}

function quickLicence(licence){

    goToLicencePage(licence);

}

function quickPerso(licence,perso){

    resetAllFiltersForTopDropdown();

    quickTopType = "";

    document
        .querySelectorAll(
            '.licence-checkbox'
        )

        .forEach(i => {

            i.checked =
                normalizeLicenceKey(i.value) ===
                normalizeLicenceKey(licence)

            togglePersos(i);
        });

    document
        .querySelectorAll(
            '.perso-checkbox'
        )

        .forEach(i => {

            i.checked =
                (
                    normalizeLicenceKey(i.dataset.licence) ===
                    normalizeLicenceKey(licence) &&
                    normalizeLicenceKey(i.value) ===
                    normalizeLicenceKey(perso)
                );
        });

    startSearch();
    closeTopMenus();
    closeTopMenusOnMobile();
}

function updateActiveFilters(){

    const container =
        document.getElementById(
            'activeFilters'
        );

    container.innerHTML = '';

    const displayedFilters =
        new Set();

    function addFilterTag(key,html){

        if(displayedFilters.has(key)){
            return;
        }

        displayedFilters.add(key);

        container.innerHTML += html;
    }

    const searchInput =
        document.getElementById("searchInput");

    const searchText =
        searchInput
            ? searchInput.value.trim()
            : "";

    if(searchText){

        addFilterTag(
            'search:' + searchText,
            `
                <div class="filter-tag">

                    Recherche : ${escapeHtml(searchText)}

                    <span
                        class="filter-remove"
                        onclick="removeFilter('search')"
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    if(quickTopType){

        addFilterTag(
            'quick-type:' + quickTopType,
            `
                <div class="filter-tag">

                    ${escapeHtml(quickTopType)}

                    <span
                        class="filter-remove"
                        data-value="${encodeURIComponent(quickTopType)}"
                        onclick="
                            removeFilter(
                                'quickType',
                                decodeURIComponent(
                                    this.dataset.value
                                )
                            )
                        "
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    if(refineTopType){

        addFilterTag(
            'refine-type:' + refineTopType,
            `
                <div class="filter-tag refine-filter-tag">

                    Affiner : ${escapeHtml(refineTopType)}

                    <span
                        class="filter-remove"
                        onclick="removeFilter('refineType')"
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    if(refineTopPerso){

        addFilterTag(
            'refine-perso:' + refineTopPerso,
            `
                <div class="filter-tag refine-filter-tag">

                    Affiner : ${escapeHtml(refineTopPerso)}

                    <span
                        class="filter-remove"
                        onclick="removeFilter('refinePerso')"
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    const selectedTypes =
        [...document.querySelectorAll(
            '#typeList input:checked'
        )];

    const selectedLicences =
        [...document.querySelectorAll(
            '.licence-checkbox:checked'
        )];

    const selectedPersos =
        [...document.querySelectorAll(
            '.perso-checkbox:checked'
        )];

    if(routeLicenceFilter){

        addFilterTag(
            'licence:' + routeLicenceFilter,
            `
                <div class="filter-tag">

                    ${escapeHtml(routeLicenceFilter)}

                    <span
                        class="filter-remove"
                        data-value="${encodeURIComponent(routeLicenceFilter)}"
                        onclick="
                            removeFilter(
                                'licence',
                                decodeURIComponent(
                                    this.dataset.value
                                )
                            )
                        "
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    selectedTypes.forEach(i=>{

        addFilterTag(
            'type:' + i.value,
            `
                <div class="filter-tag">

                    ${i.value}

                    <span
                        class="filter-remove"
                        data-value="${encodeURIComponent(i.value)}"
                        onclick="
                            removeFilter(
                                'type',
                                decodeURIComponent(
                                    this.dataset.value
                                )
                            )
                        "
                    >
                        &times;
                    </span>

                </div>
            `
        );
    });

    selectedLicences.forEach(i=>{

        addFilterTag(
            'licence:' + i.value,
            `
                <div class="filter-tag">

                    ${i.value}

                    <span
                        class="filter-remove"
                        data-value="${encodeURIComponent(i.value)}"
                        onclick="
                            removeFilter(
                                'licence',
                                decodeURIComponent(
                                    this.dataset.value
                                )
                            )
                        "
                    >
                        &times;
                    </span>

                </div>
            `
        );
    });

    selectedPersos.forEach(i=>{

        addFilterTag(
            'perso:' + i.dataset.licence + ':' + i.value,
            `
                <div class="filter-tag">

                    ${i.value}

                    <span
                        class="filter-remove"
                        data-value="${encodeURIComponent(i.value)}"
                        onclick="
                            removeFilter(
                                'perso',
                                decodeURIComponent(
                                    this.dataset.value
                                )
                            )
                        "
                    >
                        &times;
                    </span>

                </div>
            `
        );
    });

    const activeQuickBudget =
    quickBudgetCheckboxes.find(b =>
        document.getElementById(b.id).checked
    );

if(activeQuickBudget){

    addFilterTag(
        'budget',
        `
            <div class="filter-tag">

                Moins de ${activeQuickBudget.value}&euro;

                <span
                    class="filter-remove"
                    onclick="
                        document.getElementById('${activeQuickBudget.id}').checked = false;
                        minSlider.value = 1;
                        maxSlider.value = DEFAULT_MAX_PRICE;
                        updatePriceDisplay();
                        startSearch();
                    "
                >
                    &times;
                </span>

            </div>
        `
    );

} else if(
    minSlider.value !== "1" ||
    maxSlider.value !== String(DEFAULT_MAX_PRICE)
){

    addFilterTag(
        'budget',
        `
            <div class="filter-tag">

                Prix : ${minSlider.value}&euro; - ${maxSlider.value}&euro;

                <span
                    class="filter-remove"
                    onclick="
                        minSlider.value = 1;
                        maxSlider.value = DEFAULT_MAX_PRICE;
                        updatePriceDisplay();
                        startSearch();
                    "
                >
                    &times;
                </span>

            </div>
        `
    );
}

if(favoritesMode){

    addFilterTag(
        'favorites',
        `
            <div class="filter-tag">

                Favoris

                <span
                    class="filter-remove"
                    onclick="
                        favoritesMode = false;
                        updateFavoritesButton();
                        startSearch();
                    "
                >
                    &times;
                </span>

            </div>
        `
    );
}

    if(waifuMode){

        addFilterTag(
            'waifu',
            `
                <div class="filter-tag">

                    Waifu

                    <span
                        class="filter-remove"
                        onclick="toggleWaifuMode()"
                    >
                        &times;
                    </span>

                </div>
            `
        );
    }

    const hasFilters =
        selectedTypes.length ||
        selectedLicences.length ||
        selectedPersos.length ||
        routeLicenceFilter ||
        searchText ||
        quickTopType ||
        refineTopType ||
        refineTopPerso ||
        waifuMode ||
        favoritesMode ||
        activeQuickBudget ||
        minSlider.value !== "1" ||
        maxSlider.value !== String(DEFAULT_MAX_PRICE);

    document.getElementById(
        'clearAllFilters'
    ).style.display = hasFilters
        ? 'flex'
        : 'none';

    document
        .querySelector(
            '.main-header'
        )
        ?.classList.toggle(
            'has-active-filters',
            hasFilters
        );
}

/* SEARCH */

function switchHomeToCatalogueView(){

    const params =
        new URLSearchParams(
            window.location.search
        );

    if(
        window.location.pathname !== "/" ||
        params.get("page") ||
        params.get("licence")
    ){
        return;
    }

    const licenceCardsGrid =
        document.getElementById(
            "licenceCardsGrid"
        );

    const productGrid =
        document.getElementById(
            "productGrid"
        );

    updateSidebarPromoCard("catalogue");

    if(licenceCardsGrid){
        licenceCardsGrid.style.display = "none";
    }

    if(productGrid){
        productGrid.style.display = "grid";
    }

    document
        .getElementById(
            "licenceCardsSizeToggle"
        )
        .style.display = "none";
}

function startSearch(){

    switchHomeToCatalogueView();

    if(!productsLoaded){

        showProductsLoadingMessage();

        return;
    }

    const selectedTypes =

        [...document.querySelectorAll(
            '#typeList input:checked'
        )]

        .map(i => i.value);

    const selectedTypeSet =
        new Set(selectedTypes);

    const selectedLicences =

        [...document.querySelectorAll(
            '.licence-checkbox:checked'
        )]

        .map(i => i.value);

    const selectedLicenceSet =
        new Set(selectedLicences);

    refreshTopMenusPinnedLicence();

    const selectedPersos =

        [...document.querySelectorAll(
            '.perso-checkbox:checked'
        )];

    const selectedPersosByLicence =
        new Map();

    selectedPersos.forEach(input=>{

        if(!selectedPersosByLicence.has(input.dataset.licence)){
            selectedPersosByLicence.set(input.dataset.licence,new Set());
        }

        selectedPersosByLicence
            .get(input.dataset.licence)
            .add(input.value);
    });

    const searchText =

        document
        .getElementById('searchInput')
        .value
        .trim()
        .toLowerCase();

    const searchedLicence =
        findLicenceFromSearch(searchText);

    const searchedPersos =
        searchedLicence
            ? []
            : findPersosFromSearch(searchText);

    const searchedLicenceKey =
        normalizeLicenceKey(searchedLicence);

    const searchedPersoKeys =
        searchedPersos.map(
            normalizeLicenceKey
        );

    const hasRefinementBaseContext =
        Boolean(
            routeLicenceFilter ||
            searchText ||
            quickTopType ||
            selectedTypes.length ||
            selectedLicences.length ||
            selectedPersos.length
        );

    syncDefaultSortForContext();

    const sort =
        document.getElementById(
            'sortSelect'
        ).value;

    const minPrice =
        parseFloat(minSlider.value);

    const maxPrice =
        parseFloat(maxSlider.value);

    const routeLicenceKey =
        normalizeLicenceKey(routeLicenceFilter);

    const activeLicenceScopes =
        [
            routeLicenceFilter,
            searchedLicence,
            ...selectedLicences,
            ...selectedPersosByLicence.keys()
        ]
            .filter(Boolean)
            .filter(licence =>
                isLicenceVisible(licence) &&
                getLicenceGroup(licence).length
            );

    const contextResults =
        allProducts.filter(p=>{

        if(
            !isLicenceVisible(p.licence) &&
            !activeLicenceScopes.some(licence =>
                productMatchesLicence(p,licence)
            )
        ){
            return false;
        }

        if(
            routeLicenceFilter &&
            !productMatchesLicence(
                p,
                routeLicenceFilter
            )
        ){
            return false;
        }

        if(
            searchedLicence &&
            !productMatchesLicence(
                p,
                searchedLicence
            )
        ){
            return false;
        }

        if(
            searchedPersos.length &&
            !searchedPersoKeys.some(
                persoKey =>
                    p._persoKeys.has(persoKey)
            )
        ){
            return false;
        }

        if(
            quickTopType &&
            p.type !== quickTopType
        ){
            return false;
        }

        if(
            selectedTypes.length &&
            !selectedTypeSet.has(p.type)
        ){
            return false;
        }


        if(
            waifuMode &&
            p.waifu != '1'
        ){
            return false;
        }

        if(
            selectedLicences.length &&
            !selectedLicences.some(licence =>
                productMatchesLicence(
                    p,
                    licence
                )
            )
        ){
            return false;
        }

        const persosForLicence =
            new Set();

        selectedPersosByLicence.forEach((persos,licence)=>{

            if(
                productMatchesLicence(
                    p,
                    licence
                )
            ){
                persos.forEach(perso =>
                    persosForLicence.add(perso)
                );
            }
        });

        if(
            persosForLicence &&
            persosForLicence.size > 0
        ){

            const hasSelectedPerso =
                [...persosForLicence]
                    .some(perso =>
                        p._persoKeys.has(
                            normalizeLicenceKey(perso)
                        )
                    );

            if(!hasSelectedPerso){
                return false;
            }
        }

        if(
            p._price < minPrice ||
            p._price > maxPrice
        ){
            return false;
        }

        if(
            favoritesMode &&
            !isFavorite(p.url)
        ){
            return false;
        }

        if(
            searchText &&
            !searchedLicence &&
            !searchedPersos.length
        ){

            if(!p._searchText.includes(searchText)){
                return false;
            }
        }

        return true;
        });

    const refinePersoKey =
        normalizeLicenceKey(
            refineTopPerso
        );

    allResults =
        contextResults.filter(product =>{

            if(
                refineTopType &&
                product.type !== refineTopType
            ){
                return false;
            }

            if(
                refinePersoKey &&
                !product._persoKeys.has(
                    refinePersoKey
                )
            ){
                return false;
            }

            return true;
        });

    allResults.sort((a,b)=>{

        if(sort === "random"){
            return a._randomSort - b._randomSort;
        }

        if(sort === "price-asc"){
            return a._price - b._price;
        }

        if(sort === "price-desc"){
            return b._price - a._price;
        }

        if(sort === "licence-asc"){
            return (
                compareText(a.licence,b.licence) ||
                compareText(a.name,b.name)
            );
        }

        if(sort === "licence-desc"){
            return (
                compareText(b.licence,a.licence) ||
                compareText(a.name,b.name)
            );
        }

        if(sort === "type-asc"){
            return (
                compareText(a.type,b.type) ||
                compareText(a.licence,b.licence) ||
                compareText(a.name,b.name)
            );
        }

        if(sort === "type-desc"){
            return (
                compareText(b.type,a.type) ||
                compareText(a.licence,b.licence) ||
                compareText(a.name,b.name)
            );
        }

        if(sort === "perso-asc"){
            return (
                compareText(
                    getProductSortLicence(a),
                    getProductSortLicence(b)
                ) ||
                compareText(
                    firstPersoName(a),
                    firstPersoName(b)
                ) ||
                compareText(a.type,b.type) ||
                compareText(a.name,b.name) ||
                compareText(a.url,b.url)
            );
        }

        if(sort === "perso-desc"){
            return (
                compareText(
                    getProductSortLicence(a),
                    getProductSortLicence(b)
                ) ||
                compareText(
                    firstPersoName(b),
                    firstPersoName(a)
                ) ||
                compareText(a.type,b.type) ||
                compareText(a.name,b.name) ||
                compareText(a.url,b.url)
            );
        }
    });

    displayProducts();

    updateRefinementGroupVisibility(
        allResults.length > 0
    );

    scheduleRefinementMenusUpdate(
        contextResults,
        hasRefinementBaseContext
    );

    updateSidebarTypeVisibility();

    updateActiveFilters();
}

function removeFilter(type,value){

    if(type === 'search'){

        const searchInput =
            document.getElementById("searchInput");

        if(searchInput){
            searchInput.value = "";
        }
    }

    if(type === 'quickType'){

        quickTopType = "";
    }

    if(type === 'refineType'){

        refineTopType = "";
    }

    if(type === 'refinePerso'){

        refineTopPerso = "";
    }

        if(
        type === "licence" &&
        window.location.pathname.startsWith("/licence/")
    ){
        window.location.href =
    window.location.hostname === "127.0.0.1"

    ? "/?page=catalogue"

    : "/catalogue";
        return;
    }

    if(
        type === "licence" &&
        new URLSearchParams(window.location.search).get("licence")
    ){
        window.location.href = "/?page=catalogue";
        return;
    }

    if(type === 'type'){

        document
            .querySelectorAll(
                '#typeList input'
            )
            .forEach(i=>{

                if(i.value === value){

                    i.checked = false;
                }
            });
    }

    if(type === 'licence'){

        document
            .querySelectorAll(
                '.licence-checkbox'
            )
            .forEach(i=>{

                if(i.value === value){

                    i.checked = false;

                    togglePersos(i);
                }
            });
    }

    if(type === 'perso'){

        document
            .querySelectorAll(
                '.perso-checkbox'
            )
            .forEach(i=>{

                if(i.value === value){

                    i.checked = false;
                }
            });
    }

    startSearch();
}

/* DISPLAY */

function updateSidebarTypeVisibility(){

    const hasCheckedType =
        document.querySelector(
            '#typeList input:checked'
        );

    const availableTypes =
        new Set(
            allResults
                .map(p => p.type)
                .filter(Boolean)
        );

    document
        .querySelectorAll(
            '#typeList input'
        )
        .forEach(input=>{

            const label =
                input.closest('label');

            if(!label){
                return;
            }

            if(
                hasCheckedType ||
                availableTypes.has(input.value) ||
                input.checked
            ){
                label.style.display = "block";
            } else {
                label.style.display = "none";
            }
        });
}

function buildProductCardHTML(
    product,
    prioritizeImage = false
){

    const productCharacters =
        splitMultiValues(product.perso)
            .join(", ");

    const productImageTitle =
        productCharacters
            ? productCharacters
            : "";

    const adminButton =
        isAdminMode()

        ? `
                <button
                    class="admin-hide-product-btn"
                    data-product-url="${escapeAttr(product.url)}"
                    data-product-name="${escapeAttr(product.name)}"
                    data-product-image="${escapeAttr(product.image)}"
                    data-licence="${escapeAttr(product.licence)}"
                    data-product-runtime-id="${escapeAttr(product._runtimeId)}"
                    onclick="
                        event.stopPropagation();
                        adminHideProduct(this)
                    "
                    title="Masquer cet article"
                    aria-label="Masquer cet article"
                >
                    x
                </button>
            `

        : "";

    return `

        <div
            class="card"
            data-product-runtime-id="${escapeAttr(product._runtimeId)}"
        >

            <div class="card-image-wrapper">

                ${adminButton}

                <button
                    class="favorite-btn ${isFavorite(product.url) ? 'active' : ''}"
                    data-product-url="${escapeAttr(product.url)}"

                    onclick="
                        event.stopPropagation();
                        toggleFavorite('${product.url}',this)
                    "
                >
                    &#10084;
                </button>

                <img
                    loading="${prioritizeImage ? "eager" : "lazy"}"
                    fetchpriority="${prioritizeImage ? "high" : "auto"}"
                    src="${escapeAttr(product.image)}"
                    ${productImageTitle ? `title="${escapeAttr(productImageTitle)}"` : ""}
                    ${productImageTitle ? `aria-label="${escapeAttr(productImageTitle)}"` : ""}
                    onclick="
                        openModal(
                            '${escapeAttr(product.image)}',
                            true,
                            '${escapeAttr(product._runtimeId)}'
                        )
                    "
                >

            </div>

            <p title="${escapeAttr(product.name)}">
                  ${escapeHtml(product.name)}
            </p>

            <div class="price">
                ${escapeHtml(product.price)}
            </div>

            <a
                href="${escapeAttr(product.url)}"
                target="_blank"
                class="amazon-btn"
            >
                Voir sur Amazon
            </a>

        </div>
    `;
}

function displayProducts(){

    const grid =
        document.getElementById(
            "productGrid"
        );

    if(!grid){
        return;
    }

    const renderGeneration =
        ++productCardsRenderGeneration;

    const productsToRender =
        [...allResults];

    const availableWidth =
        grid.clientWidth ||
        window.innerWidth;

    const estimatedColumns =
        Math.max(
            2,
            Math.floor(
                availableWidth / 195
            )
        );

    const initialBatchSize =
        Math.min(
            productsToRender.length,
            Math.max(
                estimatedColumns,
                Math.min(
                    16,
                    estimatedColumns * 2
                )
            )
        );

    const priorityImageCount =
        Math.min(
            productsToRender.length,
            estimatedColumns
        );

    const chunkSize = 48;

    const buildBatch = (
        start,
        end,
        prioritizeFirstImages = false
    ) =>
        productsToRender
            .slice(start,end)
            .map((product,index) =>
                buildProductCardHTML(
                    product,
                    prioritizeFirstImages &&
                    start + index <
                        priorityImageCount
                )
            )
            .join("");

    grid.innerHTML =
        productsToRender.length
            ? buildBatch(
                0,
                initialBatchSize,
                true
            )
            : `
                <div class="no-products-message">
                    Aucun article ne correspond aux filtres actuels.
                </div>
            `;

    showAmazonDisclosure();

    let nextIndex =
        initialBatchSize;

    const appendNextBatch = ()=>{

        if(
            renderGeneration !==
                productCardsRenderGeneration ||
            nextIndex >=
                productsToRender.length
        ){
            return;
        }

        const visibleProductIds =
            new Set(
                allResults.map(
                    product =>
                        product._runtimeId
                )
            );

        const batchProducts =
            productsToRender
                .slice(
                    nextIndex,
                    nextIndex + chunkSize
                )
                .filter(product =>
                    visibleProductIds.has(
                        product._runtimeId
                    )
                );

        if(batchProducts.length){
            grid.insertAdjacentHTML(
                "beforeend",
                batchProducts
                    .map(product =>
                        buildProductCardHTML(
                            product
                        )
                    )
                    .join("")
            );
        }

        nextIndex +=
            chunkSize;

        scheduleNextBatch();
    };

    const scheduleNextBatch = ()=>{

        if(
            renderGeneration !==
                productCardsRenderGeneration ||
            nextIndex >=
                productsToRender.length
        ){
            return;
        }

        if("requestIdleCallback" in window){
            window.requestIdleCallback(
                appendNextBatch,
                {timeout:180}
            );
            return;
        }

        setTimeout(
            appendNextBatch,
            35
        );
    };

    scheduleNextBatch();
}

/* MODAL */

let modalZoomAllowed = false;
let modalZoomActive = false;
let modalProductItems = [];
let modalProductIndex = -1;
let modalTouchStartX = 0;
let modalTouchStartY = 0;
let modalSwipeHandledAt = 0;
let modalReturnsHeroToBanner = false;

function ensureModalNavigationControls(){

    const modal =
        document.getElementById("imageModal");

    if(!modal){
        return;
    }

    if(
        !modal.querySelector(
            ".modal-close"
        )
    ){

        const closeButton =
            document.createElement("button");

        closeButton.type = "button";
        closeButton.className =
            "modal-close";
        closeButton.textContent = "\u00d7";
        closeButton.title =
            "Fermer l'image";
        closeButton.setAttribute(
            "aria-label",
            "Fermer l'image"
        );
        closeButton.onclick = event =>{
            event.preventDefault();
            event.stopPropagation();
            closeModal();
        };

        modal.appendChild(closeButton);
    }

    if(modal.querySelector(".modal-nav")){
        return;
    }

    const previousButton =
        document.createElement("button");

    previousButton.type = "button";
    previousButton.className =
        "modal-nav modal-nav-previous";
    previousButton.textContent = "\u2039";
    previousButton.title = "Article pr\u00e9c\u00e9dent";
    previousButton.setAttribute(
        "aria-label",
        "Article pr\u00e9c\u00e9dent"
    );
    previousButton.onclick = event =>{
        event.preventDefault();
        event.stopPropagation();
        navigateModalProduct(-1);
    };

    const nextButton =
        document.createElement("button");

    nextButton.type = "button";
    nextButton.className =
        "modal-nav modal-nav-next";
    nextButton.textContent = "\u203A";
    nextButton.title = "Article suivant";
    nextButton.setAttribute(
        "aria-label",
        "Article suivant"
    );
    nextButton.onclick = event =>{
        event.preventDefault();
        event.stopPropagation();
        navigateModalProduct(1);
    };

    modal.append(
        previousButton,
        nextButton
    );
}

function updateModalNavigationVisibility(){

    const modal =
        document.getElementById("imageModal");

    if(!modal){
        return;
    }

    modal.classList.toggle(
        "product-navigation-enabled",
        modalProductItems.length > 1 &&
        modalProductIndex >= 0
    );
}

function loadModalImage(src){

    const modalImg =
        document.getElementById("modalImg");

    if(modalImg){
        resetModalZoom();

        modalImg.classList.add("loading");
        modalImg.removeAttribute("src");

        modalImg.classList.toggle(
            "zoom-ready",
            modalZoomAllowed &&
            isModalZoomEnabled()
        );

        modalImg.onload = ()=>{
            modalImg.classList.remove("loading");
        };

        modalImg.src = src;
    }
}

function openModal(
    src,
    allowZoom = false,
    productRuntimeId = "",
    returnHeroToBanner = false
){

    ensureModalNavigationControls();

    modalZoomAllowed =
        Boolean(allowZoom);
    modalReturnsHeroToBanner =
        Boolean(returnHeroToBanner);

    if(productRuntimeId !== ""){

        modalProductItems =
            [...allResults];

        modalProductIndex =
            modalProductItems.findIndex(
                product =>
                    String(product._runtimeId) ===
                    String(productRuntimeId)
            );
    } else {

        modalProductItems = [];
        modalProductIndex = -1;
    }

    updateModalNavigationVisibility();
    loadModalImage(src);

    document
        .getElementById("imageModal")
        .style.display = "flex";
}

function navigateModalProduct(direction){

    if(
        modalProductItems.length <= 1 ||
        modalProductIndex < 0
    ){
        return;
    }

    modalProductIndex =
        (
            modalProductIndex +
            direction +
            modalProductItems.length
        ) % modalProductItems.length;

    const product =
        modalProductItems[modalProductIndex];

    if(product?.image){
        loadModalImage(product.image);
        scrollToModalProductCard(product);
    }
}

function scrollToModalProductCard(
    product,
    remainingAttempts = 12
){

    if(!product?._runtimeId){
        return;
    }

    const card =
        document.querySelector(
            `.card[data-product-runtime-id="${product._runtimeId}"]`
        );

    if(card){
        card.scrollIntoView({
            behavior:"smooth",
            block:"center",
            inline:"nearest"
        });
        return;
    }

    if(remainingAttempts <= 0){
        return;
    }

    setTimeout(
        () =>
            scrollToModalProductCard(
                product,
                remainingAttempts - 1
            ),
        80
    );
}

function closeModal(){

    const shouldReturnHeroToBanner =
        modalReturnsHeroToBanner;

    modalReturnsHeroToBanner = false;

    resetModalZoom();

    const modalImg =
        document.getElementById("modalImg");

    if(modalImg){
        modalImg.classList.add("loading");
        modalImg.removeAttribute("src");
    }

    document
        .getElementById("imageModal")
        .style.display = "none";

    modalProductItems = [];
    modalProductIndex = -1;
    updateModalNavigationVisibility();

    if(shouldReturnHeroToBanner){
        heroDisplayMode = "banner";

        localStorage.setItem(
            HERO_DISPLAY_MODE_STORAGE_KEY,
            heroDisplayMode
        );

        applyHeroDisplayMode();
    }
}

function isModalZoomEnabled(){

    return window.matchMedia(
        "(min-width: 769px) and (hover: hover) and (pointer: fine)"
    ).matches;
}

function resetModalZoom(){

    modalZoomActive = false;

    const modalImg =
        document.getElementById("modalImg");

    if(!modalImg){
        return;
    }

    modalImg.classList.remove("zoomed");
    modalImg.style.transformOrigin = "center center";
}

function updateModalZoom(event){

    if(
        !modalZoomAllowed ||
        !modalZoomActive ||
        !isModalZoomEnabled()
    ){
        return;
    }

    const modalImg =
        event.currentTarget;

    const rect =
        modalImg.getBoundingClientRect();

    const x =
        ((event.clientX - rect.left) / rect.width) * 100;

    const y =
        ((event.clientY - rect.top) / rect.height) * 100;

    modalImg.classList.add("zoomed");
    modalImg.style.transformOrigin =
        `${x}% ${y}%`;
}

function toggleModalZoom(event){

    if(
        Date.now() -
        modalSwipeHandledAt < 500
    ){
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if(
        !modalZoomAllowed ||
        !isModalZoomEnabled()
    ){
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    modalZoomActive = !modalZoomActive;

    if(!modalZoomActive){
        resetModalZoom();
        return;
    }

    updateModalZoom(event);
}

const modalImg =
    document.getElementById("modalImg");

if(modalImg){

    modalImg.addEventListener(
        "mousemove",
        updateModalZoom
    );

    modalImg.addEventListener(
        "click",
        toggleModalZoom
    );

    modalImg.addEventListener(
        "mouseleave",
        resetModalZoom
    );

    modalImg.addEventListener(
        "touchstart",
        event =>{

            if(
                modalProductItems.length <= 1 ||
                event.touches.length !== 1
            ){
                return;
            }

            modalTouchStartX =
                event.touches[0].clientX;

            modalTouchStartY =
                event.touches[0].clientY;
        },
        {passive:true}
    );

    modalImg.addEventListener(
        "touchend",
        event =>{

            if(
                modalProductItems.length <= 1 ||
                event.changedTouches.length !== 1
            ){
                return;
            }

            const deltaX =
                event.changedTouches[0].clientX -
                modalTouchStartX;

            const deltaY =
                event.changedTouches[0].clientY -
                modalTouchStartY;

            if(
                Math.abs(deltaX) < 55 ||
                Math.abs(deltaX) <=
                    Math.abs(deltaY)
            ){
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            modalSwipeHandledAt =
                Date.now();

            navigateModalProduct(
                deltaX < 0 ? 1 : -1
            );
        }
    );
}

document.addEventListener(
    "keydown",
    event =>{

        const modal =
            document.getElementById(
                "imageModal"
            );

        if(
            !modal ||
            modal.style.display !== "flex"
        ){
            return;
        }

        if(event.key === "Escape"){
            closeModal();
            return;
        }

        if(
            modalProductItems.length <= 1
        ){
            return;
        }

        if(event.key === "ArrowLeft"){
            event.preventDefault();
            navigateModalProduct(-1);
        }

        if(event.key === "ArrowRight"){
            event.preventDefault();
            navigateModalProduct(1);
        }
    }
);

/* BUDGET */

const minSlider =
    document.getElementById("minPrice");

const maxSlider =
    document.getElementById("maxPrice");

const minValue =
    document.getElementById("minPriceValue");

const maxValue =
    document.getElementById("maxPriceValue");

minSlider.max =
    DEFAULT_MAX_PRICE;

maxSlider.max =
    DEFAULT_MAX_PRICE;

if(parseInt(maxSlider.value) < DEFAULT_MAX_PRICE){

    maxSlider.value =
        DEFAULT_MAX_PRICE;
}

function updatePriceDisplay(){

    if(
        parseInt(minSlider.value) >
        parseInt(maxSlider.value)
    ){
        minSlider.value =
            maxSlider.value;
    }

    minValue.textContent =
        minSlider.value + "\u20ac";

    maxValue.textContent =
        maxSlider.value + "\u20ac";
}

let priceSearchTimeout;
let isDraggingPriceHitArea = false;

minSlider.addEventListener(
    "input",
    ()=>{

        quickBudgetCheckboxes
    .forEach(b=>{

        document
            .getElementById(b.id)
            .checked = false;
    });

        updatePriceDisplay();

        clearTimeout(
            priceSearchTimeout
        );

        priceSearchTimeout =
            setTimeout(
                startSearch,
                120
            );
    }
);

maxSlider.addEventListener(
    "input",
    ()=>{

        quickBudgetCheckboxes
    .forEach(b=>{

        document
            .getElementById(b.id)
            .checked = false;
    });

        updatePriceDisplay();

        clearTimeout(
            priceSearchTimeout
        );

        priceSearchTimeout =
            setTimeout(
                startSearch,
                120
            );
    }
);

function setPriceFromSliderPointer(e){

    const isNativeSlider =
        e.target.matches('input[type="range"]');

    if(
        isNativeSlider &&
        e.type !== "pointermove"
    ){
        return;
    }

    const track =
        document.getElementById("sliderTrack");

    const rect =
        track.getBoundingClientRect();

    const hitTop =
        rect.top - 22;

    const hitBottom =
        rect.bottom + 14;

    if(
        e.clientY < hitTop ||
        e.clientY > hitBottom
    ){
        return;
    }

    e.preventDefault();

    quickBudgetCheckboxes
        .forEach(b=>{

            document
                .getElementById(b.id)
                .checked = false;
        });

    const percent =
        Math.min(
            1,
            Math.max(
                0,
                (e.clientX - rect.left) /
                rect.width
            )
        );

    const value =
        Math.round(
            1 +
            percent *
            (DEFAULT_MAX_PRICE - 1)
        );

    const minDiff =
        Math.abs(
            value -
            parseInt(
                minSlider.value
            )
        );

    const maxDiff =
        Math.abs(
            value -
            parseInt(
                maxSlider.value
            )
        );

    if(minDiff < maxDiff){

        minSlider.value =
            value;

    } else {

        maxSlider.value =
            value;
    }

    updatePriceDisplay();

    clearTimeout(
        priceSearchTimeout
    );

    priceSearchTimeout =
        setTimeout(
            startSearch,
            80
        );
}

document
    .querySelector(".range-container")
    .addEventListener(
        "pointerdown",
        e=>{

            isDraggingPriceHitArea = true;

            setPriceFromSliderPointer(e);
        }
    );

document
    .addEventListener(
        "pointermove",
        e=>{

            if(!isDraggingPriceHitArea){
                return;
            }

            setPriceFromSliderPointer(e);
        }
    );

document
    .addEventListener(
        "pointerup",
        ()=>{

            isDraggingPriceHitArea = false;
        }
    );

document
    .addEventListener(
        "pointercancel",
        ()=>{

            isDraggingPriceHitArea = false;
        }
    );

const quickBudgetCheckboxes = [

    {
        id:"under20",
        value:20
    },

    {
        id:"under50",
        value:50
    },

    {
        id:"under100",
        value:100
    },

    {
        id:"under200",
        value:200
    }
];

quickBudgetCheckboxes.forEach(b=>{

    const checkbox =
        document.getElementById(b.id);

    checkbox.addEventListener(
        "change",
        ()=>{

            if(checkbox.checked){

                quickBudgetCheckboxes
                    .forEach(other=>{

                        if(other.id !== b.id){

                            document
                                .getElementById(other.id)
                                .checked = false;
                        }
                    });

                minSlider.value = 1;

                maxSlider.value = b.value;

            } else {

                minSlider.value = 1;

                maxSlider.value = DEFAULT_MAX_PRICE;
            }

            updatePriceDisplay();

            startSearch();
        }
    );
});

updatePriceDisplay();

function scrollResultsToTop(){

    const products =
        document.querySelector(".products");

    if(products){

        try{

            products.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch(error){

            products.scrollTop = 0;
        }
    }

    const pageScroller =
        document.scrollingElement ||
        document.documentElement;

    try{

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch(error){

        pageScroller.scrollTop = 0;
        document.documentElement.scrollTop = 0;

        if(document.body){
            document.body.scrollTop = 0;
        }
    }
}

const resultsScrollTop =
    document.querySelector(".results-scroll-top");

function updateMobileResultsScrollTop(){

    if(!resultsScrollTop){
        return;
    }

    if(window.innerWidth > 768){

        resultsScrollTop.classList.remove(
            "is-mobile-visible"
        );

        return;
    }

    const products =
        document.querySelector(".products");

    const pageScroller =
        document.scrollingElement ||
        document.documentElement;

    const scrollPosition =
        Math.max(
            window.scrollY || 0,
            pageScroller?.scrollTop || 0,
            products?.scrollTop || 0
        );

    resultsScrollTop.classList.toggle(
        "is-mobile-visible",
        scrollPosition > 24
    );
}

if(resultsScrollTop){

    resultsScrollTop.addEventListener(
        "click",
        scrollResultsToTop,
        { capture: true }
    );

    window.addEventListener(
        "scroll",
        updateMobileResultsScrollTop,
        { passive: true }
    );

    document
        .querySelector(".products")
        ?.addEventListener(
            "scroll",
            updateMobileResultsScrollTop,
            { passive: true }
        );

    updateMobileResultsScrollTop();
}

const sidebar = document.querySelector('.sidebar');

const sidebarBackToTop =
    document.querySelector('.back-to-top');

sidebarBackToTop.style.display = 'none';

sidebar.addEventListener('scroll',()=>{

    if(sidebar.scrollTop > 120){

        sidebarBackToTop.style.display = 'flex';

    } else {

        sidebarBackToTop.style.display = 'none';
    }
});

function getSidebarPromoStorageKey(mode){

    return [
        "kadotaku_sidebar_promo_variant",
        licenceUniverseMode,
        mode
    ].join("_");
}

function getSidebarPromoChoices(mode,baseImage){

    const variants =
        SIDEBAR_PROMO_VARIANTS
            [licenceUniverseMode]
            ?.[mode] || [];

    return [
        {
            id: "simple",
            label: "Simple",
            image: baseImage
        },
        ...variants
    ];
}

function getSelectedSidebarPromoChoice(
    mode,
    baseImage
){

    const choices =
        getSidebarPromoChoices(
            mode,
            baseImage
        );

    let stored = "";

    try{
        stored =
            localStorage.getItem(
                getSidebarPromoStorageKey(mode)
            ) || "";
    } catch(error){
        stored = "";
    }

    return choices.find(choice =>
        choice.id === stored
    ) || choices[0];
}

function cycleSidebarPromoVariant(
    event,
    mode,
    direction = 1
){

    event.preventDefault();
    event.stopPropagation();

    const baseImage =
        mode === "home"
            ? (
                licenceUniverseMode === "game"
                    ? "/images/Cards Accueil/Bouton Accueil Game.webp"
                    : "/images/Cards Accueil/Bouton Accueil Anime.webp"
            )
            : (
                licenceUniverseMode === "game"
                    ? "/images/Cards Catalogue/Bouton Catalogue Game.webp"
                    : "/images/Cards Catalogue/Bouton Catalogue Anime.webp"
            );

    const choices =
        getSidebarPromoChoices(
            mode,
            baseImage
        );

    if(choices.length < 3){
        return false;
    }

    const selected =
        getSelectedSidebarPromoChoice(
            mode,
            baseImage
        );

    const currentIndex =
        Math.max(
            0,
            choices.findIndex(choice =>
                choice.id === selected.id
            )
        );

    const nextChoice =
        choices[
            (
                currentIndex +
                direction +
                choices.length
            ) %
            choices.length
        ];

    try{
        if(nextChoice.id === "simple"){
            localStorage.removeItem(
                getSidebarPromoStorageKey(mode)
            );
        } else {
            localStorage.setItem(
                getSidebarPromoStorageKey(mode),
                nextChoice.id
            );
        }
    } catch(error){
        // The image still changes for this render even if storage is blocked.
    }

    updateSidebarPromoCard(mode);

    return false;
}

function updateSidebarPromoCard(mode, licence = ""){

    const box =
        document.getElementById(
            "sidebarPromoCard"
        );

    if(!box){
        return;
    }

    let image = "";

    let alt = "";

    let baseImage = "";

    let variants = [];

    let selectedChoice = null;

    sidebarPromoState = {
        mode,
        licence
    };

    if(mode === "home"){

        baseImage =
            licenceUniverseMode === "game"
                ? "/images/Cards Accueil/Bouton Accueil Game.webp"
                : "/images/Cards Accueil/Bouton Accueil Anime.webp";

        variants =
            SIDEBAR_PROMO_VARIANTS
                [licenceUniverseMode]
                ?.home || [];

        selectedChoice =
            getSelectedSidebarPromoChoice(
                mode,
                baseImage
            );

        image = selectedChoice.image;

        alt =
            licenceUniverseMode === "game"
                ? "Accueil Kadotaku Game"
                : "Accueil Kadotaku";
    }

    else if(mode === "catalogue"){

        baseImage =
            licenceUniverseMode === "game"
                ? "/images/Cards Catalogue/Bouton Catalogue Game.webp"
                : "/images/Cards Catalogue/Bouton Catalogue Anime.webp";

        variants =
            SIDEBAR_PROMO_VARIANTS
                [licenceUniverseMode]
                ?.catalogue || [];

        selectedChoice =
            getSelectedSidebarPromoChoice(
                mode,
                baseImage
            );

        image = selectedChoice.image;

        alt =
            licenceUniverseMode === "game"
                ? "Catalogue Kadotaku Game"
                : "Catalogue Kadotaku Anime";
    }

    else if(
        mode === "licence" &&
        licence
    ){

        image =
            `/images/Cards Licence/Card ${licence}.webp`;

        alt =
            licence;
    }

    else {

        box.style.display = "none";

        box.innerHTML = "";

        return;
    }

    box.style.display = "block";

    box.innerHTML = `

        <button
            type="button"
            class="mobile-promo-toggle"
            aria-label="Replier la vignette"
            aria-expanded="true"
            onclick="toggleMobileSidebarPromo(event)"
        >
            <span class="mobile-promo-toggle-expanded">
                &#8593;
            </span>
            <span class="mobile-promo-toggle-collapsed">
                &#8595; Afficher Vignette
            </span>
        </button>

        <div
            class="sidebar-promo-visual"
            style="
                position:relative;
            "
        >

            <img
                src="${image}"
                alt="${alt}"
            >

            ${
                variants.length >= 2
                    ? `
                        <div
                            class="sidebar-promo-cycle-controls"
                        >
                            <button
                                type="button"
                                class="sidebar-promo-cycle"
                                title="Card précédente — actuelle : ${escapeAttr(
                                    selectedChoice?.label ||
                                    "Simple"
                                )}"
                                aria-label="Afficher la card précédente"
                                onclick="return cycleSidebarPromoVariant(event,'${mode}',-1);"
                            >
                                &#8592;
                            </button>
                            <button
                                type="button"
                                class="sidebar-promo-cycle"
                                title="Card suivante — actuelle : ${escapeAttr(
                                    selectedChoice?.label ||
                                    "Simple"
                                )}"
                                aria-label="Afficher la card suivante"
                                onclick="return cycleSidebarPromoVariant(event,'${mode}',1);"
                            >
                                &#8594;
                            </button>
                        </div>
                    `
                    : ""
            }

            <span
                class="sidebar-promo-expand"

                onclick="
                    event.preventDefault();

                    event.stopPropagation();

                    openModal('${image}',true);

                    return false;
                "
            >
                &#128269;
            </span>

        </div>
    `;

    placeSidebarPromoCardForViewport();
    updateMobileSidebarPromoState();
}

function updateMobileSidebarPromoState(){

    const box =
        document.getElementById(
            "sidebarPromoCard"
        );

    if(!box){
        return;
    }

    box.classList.toggle(
        "is-mobile-collapsed",
        mobileSidebarPromoCollapsed
    );

    const toggle =
        box.querySelector(
            ".mobile-promo-toggle"
        );

    if(toggle){

        toggle.setAttribute(
            "aria-expanded",
            String(
                !mobileSidebarPromoCollapsed
            )
        );

        toggle.setAttribute(
            "aria-label",
            mobileSidebarPromoCollapsed
                ? "Afficher la vignette"
                : "Replier la vignette"
        );
    }
}

function toggleMobileSidebarPromo(event){

    event?.preventDefault();
    event?.stopPropagation();

    mobileSidebarPromoCollapsed =
        !mobileSidebarPromoCollapsed;

    updateMobileSidebarPromoState();

    return false;
}

function placeSidebarPromoCardForViewport(){

    const box =
        document.getElementById(
            "sidebarPromoCard"
        );

    const sidebar =
        document.querySelector(".sidebar");

    const products =
        document.querySelector(".products");

    if(
        !box ||
        !sidebar ||
        !products
    ){
        return;
    }

    let mobileHost =
        document.getElementById(
            "mobileSidebarPromoHost"
        );

    if(!mobileHost){

        mobileHost =
            document.createElement("div");

        mobileHost.id =
            "mobileSidebarPromoHost";

        mobileHost.className =
            "mobile-sidebar-promo-host";

        products.insertAdjacentElement(
            "beforebegin",
            mobileHost
        );
    }

    if(window.innerWidth <= 768){

        mobileHost.appendChild(box);

        return;
    }

    sidebar.prepend(box);
}

function handleLicenceRoute(){

    const path =
        window.location.pathname;

    const params =
        new URLSearchParams(
            window.location.search
        );

    const localLicence =
        params.get("licence");

    const localPage =
        params.get("page");

    const licenceCardsGrid =
        document.getElementById(
            "licenceCardsGrid"
        );

    const productGrid =
        document.getElementById(
            "productGrid"
        );

    if(
        path === "/" &&
        !localPage &&
        !localLicence
    ){

        resetAllFiltersForTopDropdown();

        updateSidebarPromoCard("home");

        if(licenceCardsGrid){
            licenceCardsGrid.style.display = "grid";
        }

        document
            .getElementById("featuredLicenceCardsGrid")
            ?.style
            .setProperty("display","grid");

        const userFeaturedGrid =
            document.getElementById(
                "userFeaturedLicenceCardsGrid"
            );

        if(
            userFeaturedGrid &&
            userFeaturedGrid.childElementCount
        ){
            userFeaturedGrid.style.display = "grid";
        }

        document.getElementById(
            "licenceCardsSizeToggle"
        ).style.display = "flex";

        if(productGrid){
            productGrid.style.display = "none";
        }

        updateActiveFilters();

        return;
    }

    if(
        path === "/catalogue" ||
        localPage === "catalogue"
    ){

        resetAllFiltersForTopDropdown();

        updateSidebarPromoCard("catalogue");

        if(licenceCardsGrid){
            licenceCardsGrid.style.display = "none";
        }

        document
            .getElementById("featuredLicenceCardsGrid")
            ?.style
            .setProperty("display","none");

        document
            .getElementById("userFeaturedLicenceCardsGrid")
            ?.style
            .setProperty("display","none");

        if(productGrid){
            productGrid.style.display = "grid";
        }

        startSearch();

        document.getElementById(
            "licenceCardsSizeToggle"
        ).style.display = "none";

        return;
    }

    let licence = "";

    if(localLicence){

        licence = localLicence;

    } else if(path.startsWith("/licence/")){

        const slug =
            decodeURIComponent(path)
                .split("/licence/")[1]
                ?.toLowerCase();

        licence = allAnime.find(l =>

            slugLicence(l) === slug
        ) || "";
    }

    if(licence){

        routeLicenceFilter = licence;

        updateSidebarPromoCard(
            "licence",
            licence
        );

        if(licenceCardsGrid){
            licenceCardsGrid.style.display = "none";
        }

        document
            .getElementById("featuredLicenceCardsGrid")
            ?.style
            .setProperty("display","none");

        document
            .getElementById("userFeaturedLicenceCardsGrid")
            ?.style
            .setProperty("display","none");

        if(productGrid){
            productGrid.style.display = "grid";
        }

        clearMainFilters();

        document.getElementById("licenceList").style.display = "block";

        document.getElementById("licenceSidebarToggle").textContent = "−";

        document
            .querySelectorAll(
                ".licence-checkbox"
            )
            .forEach(i=>{

                i.checked =
                    normalizeLicenceKey(i.value) ===
                    normalizeLicenceKey(licence);

                togglePersos(i);
            });

        startSearch();

        document.getElementById(
            "licenceCardsSizeToggle"
        ).style.display = "none";

        return;
    }

    routeLicenceFilter = "";

    updateSidebarPromoCard("catalogue");

    if(licenceCardsGrid){
        licenceCardsGrid.style.display = "none";
    }

    document
        .getElementById("featuredLicenceCardsGrid")
        ?.style
        .setProperty("display","none");

    document
        .getElementById("userFeaturedLicenceCardsGrid")
        ?.style
        .setProperty("display","none");

    if(productGrid){
        productGrid.style.display = "grid";
    }

    document.getElementById(
        "licenceCardsSizeToggle"
    ).style.display = "none";

    startSearch();
}

ensureExperimentalTopFilters();
loadData().catch(error =>{

    console.error(
        "Erreur de chargement Kadotaku :",
        error
    );

    const productGrid =
        document.getElementById(
            "productGrid"
        );

    if(productGrid){

        updateRefinementGroupVisibility(
            false
        );

        productGrid.innerHTML = `
            <div class="loading-message">
                Le chargement a rencontr&eacute; une erreur.
                Rechargez la page.
            </div>
        `;
    }
});

let openSubmenuItem = null;
let submenuCloseTimeout = null;

function isMobileTopMenu(){

    return window.matchMedia(
        "(max-width:768px)"
    ).matches;
}

function getMobileMenuPanelWidth(
    panel,
    triggerWidth = 0
){

    const viewportMaximum =
        Math.max(
            210,
            Math.min(
                340,
                window.innerWidth - 44
            )
        );

    const minimum =
        Math.min(
            viewportMaximum,
            Math.max(
                210,
                Math.min(
                    triggerWidth,
                    250
                )
            )
        );

    const style =
        getComputedStyle(panel);

    const canvas =
        getMobileMenuPanelWidth.canvas ||
        (
            getMobileMenuPanelWidth.canvas =
            document.createElement("canvas")
        );

    const context =
        canvas.getContext("2d");

    if(!context){
        return viewportMaximum;
    }

    context.font = [
        style.fontWeight || "400",
        style.fontSize || "13px",
        style.fontFamily || "sans-serif"
    ].join(" ");

    let longestTextWidth = 0;

    panel
        .querySelectorAll(
            ".dropdown-item, .top-parent-link, " +
            ".refine-dropdown-choice, " +
            ".refine-dropdown-reset, " +
            ".refine-dropdown-empty, " +
            ".filter-label-text"
        )
        .forEach(element =>{

            const text =
                element.textContent
                    .replace(/\s+/g," ")
                    .trim();

            if(!text){
                return;
            }

            longestTextWidth =
                Math.max(
                    longestTextWidth,
                    context.measureText(text).width
                );
        });

    const contentWidth =
        Math.ceil(longestTextWidth + 58);

    return Math.min(
        viewportMaximum,
        Math.max(
            minimum,
            contentWidth
        )
    );
}

function positionMobileTopDropdown(
    menuItem,
    dropdown
){

    if(
        !isMobileTopMenu() ||
        !menuItem ||
        !dropdown
    ){
        return;
    }

    const rect =
        menuItem.getBoundingClientRect();

    const panelWidth =
        getMobileMenuPanelWidth(
            dropdown,
            rect.width
        );

    const panelLeft =
        Math.max(
            12,
            Math.round(
                (window.innerWidth - panelWidth) / 2
            )
        );

    const top =
        Math.min(
            rect.bottom + 6,
            window.innerHeight - 190
        );

    dropdown.style.position = "fixed";
    dropdown.style.left =
        `${panelLeft}px`;
    dropdown.style.right = "auto";
    dropdown.style.top =
        `${Math.max(12,top)}px`;
    dropdown.style.setProperty(
        "width",
        `${panelWidth}px`,
        "important"
    );
    dropdown.style.setProperty(
        "min-width",
        "0",
        "important"
    );
    dropdown.style.setProperty(
        "max-width",
        `${window.innerWidth - 44}px`,
        "important"
    );
    dropdown.style.maxHeight =
        `${Math.max(
            170,
            window.innerHeight -
            Math.max(12,top) -
            12
        )}px`;
}

function positionTopSubmenu(item,submenu){

    const rect =
        item.getBoundingClientRect();

    const margin = 8;

    if(isMobileTopMenu()){

        const viewportMargin = 12;

        const panelWidth =
            getMobileMenuPanelWidth(
                submenu,
                rect.width
            );

        const panelLeft =
            Math.max(
                viewportMargin,
                Math.round(
                    (
                        window.innerWidth -
                        panelWidth
                    ) / 2
                )
            );

        const submenuHeight =
            Math.min(
                submenu.scrollHeight || 320,
                window.innerHeight * 0.64
            );

        const top =
            Math.min(
                Math.max(
                    viewportMargin,
                    rect.top
                ),
                Math.max(
                    viewportMargin,
                    window.innerHeight -
                    submenuHeight -
                    viewportMargin
                )
            );

        submenu.style.position = "fixed";
        submenu.style.left = `${panelLeft}px`;
        submenu.style.right = "auto";
        submenu.style.top = `${top}px`;
        submenu.style.setProperty(
            "width",
            `${panelWidth}px`,
            "important"
        );
        submenu.style.setProperty(
            "min-width",
            "0",
            "important"
        );
        submenu.style.setProperty(
            "max-width",
            `${window.innerWidth - 44}px`,
            "important"
        );
        submenu.style.maxHeight =
            `${Math.max(
                160,
                window.innerHeight - top - viewportMargin
            )}px`;
        submenu.style.marginTop = "0";

        return;
    }

    const submenuWidth =
        submenu.offsetWidth || 220;

    const submenuHeight =
        submenu.offsetHeight || 320;

    let left =
        rect.right - 2;

    if(
        left + submenuWidth + margin >
        window.innerWidth
    ){
        left =
            Math.max(
                margin,
                rect.left - submenuWidth + 2
            );
    }

    let top =
        isMobileTopMenu()
            ? rect.bottom + 6
            : rect.top;

    if(
        top + submenuHeight + margin >
        window.innerHeight
    ){
        top =
            Math.max(
                margin,
                window.innerHeight -
                submenuHeight -
                margin
            );
    }

    submenu.style.left =
        `${left}px`;

    submenu.style.top =
        `${top}px`;
}

function keepTopSubmenuOpen(item){

    clearTimeout(submenuCloseTimeout);

    if(
        openSubmenuItem &&
        openSubmenuItem !== item
    ){
        openSubmenuItem.classList.remove(
            "submenu-open"
        );
    }

    openSubmenuItem = item;

    item.classList.add(
        "submenu-open"
    );

    const submenu =
        item.querySelector(
            ".submenu"
        );

    if(submenu){
        positionTopSubmenu(item,submenu);
    }
}

function openMobileTopSubmenu(event,element){

    if(!isMobileTopMenu()){
        return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const item =
        element.closest(
            ".dropdown-item"
        );

    if(!item){
        return true;
    }

    keepTopSubmenuOpen(item);

    return true;
}

function closeTopSubmenuSoon(){

    clearTimeout(submenuCloseTimeout);

    submenuCloseTimeout =
        setTimeout(()=>{

            if(openSubmenuItem){
                openSubmenuItem.classList.remove(
                    "submenu-open"
                );
            }

            openSubmenuItem = null;

        },180);
}

document.addEventListener(
    "mouseover",
    e=>{

        if(isMobileTopMenu()){
            return;
        }

        const item =
            e.target.closest(
                ".dropdown-item"
            );

        if(!item){
            return;
        }

        const submenu =
            item.querySelector(
                ".submenu"
            );

        if(!submenu){
            return;
        }

        keepTopSubmenuOpen(item);
    }
);

document.addEventListener(
    "mouseout",
    e=>{

        if(isMobileTopMenu()){
            return;
        }

        const item =
            e.target.closest(
                ".dropdown-item.submenu-open"
            );

        if(!item){
            return;
        }

        const related =
            e.relatedTarget;

        if(
            related &&
            item.contains(related)
        ){
            return;
        }

        closeTopSubmenuSoon();
    }
);

document.addEventListener(
    "mouseover",
    e=>{

        if(isMobileTopMenu()){
            return;
        }

        const submenu =
            e.target.closest(
                ".submenu"
            );

        if(
            !submenu ||
            !openSubmenuItem ||
            !openSubmenuItem.contains(submenu)
        ){
            return;
        }

        keepTopSubmenuOpen(openSubmenuItem);
    }
);

document.addEventListener(
    "click",
    e=>{

        if(!isMobileTopMenu()){
            return;
        }

        const menuItem =
            e.target.closest(
                ".main-header-left .menu-item"
            );

        if(
            menuItem &&
            !e.target.closest(".dropdown")
        ){
            e.preventDefault();
            e.stopPropagation();

            const dropdown =
                menuItem.querySelector(
                    ".dropdown"
                );

            if(!dropdown){
                return;
            }

            const shouldOpen =
                dropdown.style.display !== "block";

            closeTopMenusOnMobile();

            if(shouldOpen){
                dropdown.style.display = "block";
                positionMobileTopDropdown(
                    menuItem,
                    dropdown
                );
            }

            return;
        }

        const submenuItem =
            e.target.closest(
                ".dropdown-item"
            );

        const submenuChoice =
            e.target.closest(
                ".submenu .dropdown-item"
            );

        if(
            submenuChoice &&
            !submenuChoice.querySelector(".submenu")
        ){
            setTimeout(
                closeTopMenusOnMobile,
                0
            );

            return;
        }

        if(
            submenuItem &&
            submenuItem.querySelector(".submenu") &&
            !e.target.closest(".submenu")
        ){
            e.preventDefault();
            e.stopPropagation();

            keepTopSubmenuOpen(submenuItem);

            return;
        }

        if(
            !e.target.closest(
                ".main-header-left .menu-item"
            )
        ){
            closeTopMenusOnMobile();
        }
    }
);

document.addEventListener("DOMContentLoaded", function () {
    placeFavoritesButtonForViewport();

    ensureHeroDisplayControls();

    const hero = document.querySelector(".hero");

    if (!hero) return;

    hero.addEventListener("click", function () {
        secretClickCount++;

        clearTimeout(secretClickTimer);

        secretClickTimer = setTimeout(function () {
            secretClickCount = 0;
        }, 2500);

        if (secretClickCount >= 10) {
            secretClickCount = 0;

            showAllLicencesSecretMode = !showAllLicencesSecretMode;

            rebuildVisibleLicenceList();

            refreshAllTypes();

            menusBuilt = false;
            ensureMenusBuilt();
            buildLicenceCards();

            const params =
                new URLSearchParams(
                    window.location.search
                );

            if(
                window.location.pathname === "/" &&
                !params.get("page") &&
                !params.get("licence")
            ){
                document.getElementById("licenceCardsGrid").style.display = "grid";
                document.getElementById("featuredLicenceCardsGrid").style.display = "grid";
                document.getElementById("productGrid").style.display = "none";
                document.getElementById("licenceCardsSizeToggle").style.display = "flex";
            }

            alert(
                showAllLicencesSecretMode
                    ? "Mode secret activ\u00e9 : toutes les licences sont visibles."
                    : "Mode secret d\u00e9sactiv\u00e9 : seules les licences actives sont visibles."
            );
        }
    });
});

let favoritesPlacementResizeTimer = null;

window.addEventListener("resize", ()=>{

    clearTimeout(favoritesPlacementResizeTimer);

    favoritesPlacementResizeTimer =
        setTimeout(()=>{

            placeResponsiveSlogan();
            placeUniverseSwitchForViewport();
            placeFavoritesButtonForViewport();
            placeMobileHeaderControls();
            placeSidebarPromoCardForViewport();
            updateMobileResultsScrollTop();

        },120);
});
