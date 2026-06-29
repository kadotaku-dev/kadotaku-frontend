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
let allTypes = [];
let allResults = [];
let productsLoaded = false;
let userSelectedSort = false;
let showAllLicencesSecretMode = false;
let licenceCardsRenderGeneration = 0;
let productCardsRenderGeneration = 0;
let animeRowByLicenceKey = new Map();
let productsByLicenceKey = new Map();
let licenceGroupCache = new Map();
let menusBuilt = false;
let menusBuilding = false;
let secretClickCount = 0;
let secretClickTimer = null;
const DEFAULT_MAX_PRICE = 1000;

let waifuMode = false;

let quickTopType = "";

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

function toggleFavorite(id){

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

    startSearch();
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

    button.innerHTML =
        favorites.length > 0

        ? `❤️ Favoris (${favorites.length})`

        : `❤️ Favoris`;
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

    const groupEntry =
        Object.entries(LICENCE_GROUPS)
            .find(([groupName]) =>
                normalizeLicenceKey(groupName) === licenceKey
            );

    if(groupEntry){
        return groupEntry[1];
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

    return [
        row[0],
        ...row.slice(3).flatMap(splitMultiValues)
    ].filter(Boolean);
}

function findLicenceFromSearch(query){

    const queryKey =
        normalizeLicenceKey(query);

    if(!queryKey){
        return "";
    }

    const row =
        animeData.find(r =>
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

    animeData =
    parseCSV(animeText);

    animeData.shift();

    rebuildAnimeIndexes();

    allAnime = animeData
    .filter(r => showAllLicencesSecretMode || r[2] == "1")
    .map(r => r[0]);

    console.time("HOME_RENDER");

    buildLicenceCards();

    if(isHomeRoute()){
        handleLicenceRoute();
    }

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

function expandLicenceCard(event,element){

    event.preventDefault();

    event.stopPropagation();

    const image =
        decodeURIComponent(
            element.dataset.image
        );

    openModal(image,true);

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

    const licences =
        sortedLicenceRows
            .filter(r =>
                !(Number(r[1]) >= 1)
            )
            .map(r => r[0]);

    const featuredLicences =
        licenceRows
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
            .map(r => r[0]);

    const availableLicenceByKey =
        new Map(
            licenceRows.map(row =>[
                normalizeLicenceKey(row[0]),
                row[0]
            ])
        );

    const userFeaturedLicences =
        userLicenceFavorites
            .map(licence =>
                availableLicenceByKey.get(
                    normalizeLicenceKey(licence)
                )
            )
            .filter(Boolean);

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
                    src="/cards/thumbs/Card ${licence}.webp"
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
                    data-image="${encodeURIComponent(`/cards/Card ${licence}.webp`)}"
                    onclick="return expandLicenceCard(event,this);"
                >
                    🔍
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
                    true
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

function buildTopMenus(){

    const typesDropdown =
        document.getElementById("typesDropdown");

    const licencesDropdown =
        document.getElementById("licencesDropdown");

    const licencesByType = new Map();
    const persosByLicence = new Map();

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
            ${licences.map(licence => `
                <div
                    class="dropdown-item"

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
                    priority:Number(row[1]) || 999999
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
        ["random","Aléatoire"],
        ["price-asc","Prix croissant"],
        ["price-desc","Prix décroissant"],
        ["licence-asc","Licence A → Z"],
        ["licence-desc","Licence Z → A"],
        ["type-asc","Type A → Z"],
        ["type-desc","Type Z → A"],
        ["perso-asc","Personnage A → Z"],
        ["perso-desc","Personnage Z → A"]
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

function clearMainFilters(){

    document
        .querySelectorAll(
            '#typeList input'
        )
        .forEach(i => i.checked = false);

    document
        .querySelectorAll(
            '.licence-checkbox'
        )
        .forEach(i => {

            i.checked = false;

            togglePersos(i);
        });

    document
        .querySelectorAll(
            '.perso-checkbox'
        )
        .forEach(i => i.checked = false);

    document
        .getElementById(
            'searchInput'
        )
        .value = "";

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
        'Mode Waifu Désactivé';

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

function handleSearchInput(){

    const value =
        document
        .getElementById(
            'searchInput'
        )
        .value
        .trim();

    clearMainFilters();

    document
        .getElementById(
            'searchInput'
        )
        .value = value;

    startSearch();
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
                        ✕
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
                        ✕
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
                        ✕
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

                Moins de ${activeQuickBudget.value}€

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
                    ✕
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

                Prix : ${minSlider.value}€ - ${maxSlider.value}€

                <span
                    class="filter-remove"
                    onclick="
                        minSlider.value = 1;
                        maxSlider.value = DEFAULT_MAX_PRICE;
                        updatePriceDisplay();
                        startSearch();
                    "
                >
                    ✕
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
                    ✕
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
                        ✕
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
        quickTopType ||
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
            '.main-title-wrapper'
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

    allResults = allProducts.filter(p=>{

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

    updateSidebarTypeVisibility();

    updateActiveFilters();
}

function removeFilter(type,value){

    if(type === 'quickType'){

        quickTopType = "";
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

                    onclick="
                        event.stopPropagation();
                        toggleFavorite('${product.url}')
                    "
                >
                    ❤
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
        buildBatch(
            0,
            initialBatchSize,
            true
        );

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

function ensureModalNavigationControls(){

    const modal =
        document.getElementById("imageModal");

    if(
        !modal ||
        modal.querySelector(".modal-nav")
    ){
        return;
    }

    const previousButton =
        document.createElement("button");

    previousButton.type = "button";
    previousButton.className =
        "modal-nav modal-nav-previous";
    previousButton.textContent = "‹";
    previousButton.title = "Article précédent";
    previousButton.setAttribute(
        "aria-label",
        "Article précédent"
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
    nextButton.textContent = "›";
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
    productRuntimeId = ""
){

    ensureModalNavigationControls();

    modalZoomAllowed =
        Boolean(allowZoom);

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
        minSlider.value + "€";

    maxValue.textContent =
        maxSlider.value + "€";
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

    if(mode === "home"){

        image =
            "/cards/Bouton accueil.webp";

        alt =
            "Accueil Kadotaku";
    }

    else if(mode === "catalogue"){

        image =
            "/cards/Bouton catalogue.webp";

        alt =
            "Catalogue Kadotaku";
    }

    else if(
        mode === "licence" &&
        licence
    ){

        image =
            `/cards/Card ${licence}.webp`;

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

        <div
            style="
                position:relative;
            "
        >

            <img
                src="${image}"
                alt="${alt}"
            >

            <span
                class="sidebar-promo-expand"

                onclick="
                    event.preventDefault();

                    event.stopPropagation();

                    openModal('${image}',true);

                    return false;
                "
            >
                🔍
            </span>

        </div>
    `;
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

loadData();

let openSubmenuItem = null;
let submenuCloseTimeout = null;

function isMobileTopMenu(){

    return window.matchMedia(
        "(max-width:768px)"
    ).matches;
}

function positionTopSubmenu(item,submenu){

    const rect =
        item.getBoundingClientRect();

    const margin = 8;

    if(isMobileTopMenu()){

        const menuBar =
            item.closest(".main-header-left");

        const menuBarRect =
            menuBar
                ? menuBar.getBoundingClientRect()
                : {bottom:120};

        const viewportMargin = 10;

        const minTop =
            Math.min(
                window.innerHeight - 180,
                menuBarRect.bottom + viewportMargin
            );

        const submenuHeight =
            Math.min(
                submenu.scrollHeight || 320,
                window.innerHeight * 0.48
            );

        const maxTop =
            Math.max(
                minTop,
                window.innerHeight -
                submenuHeight -
                viewportMargin
            );

        const top =
            Math.min(
                Math.max(rect.top,minTop),
                maxTop
            );

        const dropdown =
            item.closest(".dropdown");

        const dropdownRect =
            dropdown
                ? dropdown.getBoundingClientRect()
                : {
                    left:viewportMargin,
                    width:window.innerWidth - viewportMargin * 2
                };

        submenu.style.position = "fixed";
        submenu.style.left =
            `${Math.max(viewportMargin,dropdownRect.left + viewportMargin)}px`;
        submenu.style.top = `${top}px`;
        submenu.style.width =
            `${Math.min(
                window.innerWidth - viewportMargin * 2,
                dropdownRect.width - viewportMargin * 2
            )}px`;
        submenu.style.minWidth = "0";
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

            allAnime = animeData
                .filter(r => showAllLicencesSecretMode || r[2] == "1")
                .map(r => r[0]);

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
                    ? "Mode secret activé : toutes les licences sont visibles."
                    : "Mode secret désactivé : seules les licences actives sont visibles."
            );
        }
    });
});
