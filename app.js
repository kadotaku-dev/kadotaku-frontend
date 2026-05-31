const API_URL =
"https://kadotaku-backend-production.up.railway.app";

const animeSheetURL =
"https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=licences";

let allProducts = [];
let allAnime = [];
let animeData = [];
let allTypes = [];
let allResults = [];
let showAllLicencesSecretMode = false;
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

let routeLicenceFilter = "";

routeLicenceFilter = "";

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

function prepareProduct(product){

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

function findPersoFromSearch(query){

    const queryKey =
        normalizeLicenceKey(query);

    if(queryKey.length < 3){
        return "";
    }

    const persos =
        [...new Set(
            allProducts
                .flatMap(p => p._persos || [])
                .filter(perso =>
                    perso &&
                    normalizeLicenceKey(perso) !== "divers"
                )
        )];

    return persos
        .sort((a,b)=> a.length - b.length)
        .find(perso=>{

            const persoKey =
                normalizeLicenceKey(perso);

            return (
                persoKey === queryKey ||
                persoKey.includes(queryKey)
            );
        }) || "";
}

/* LOAD */

async function loadData(){

    ensureSortOptions();

    console.time("TOTAL");

    console.time("FETCH");

    const [
        animeRes,
        productsRes
    ] = await Promise.all([

        fetch(animeSheetURL),

        fetch(API_URL + "/api/all")
    ]);

    console.timeEnd("FETCH");

    const animeText =
        await animeRes.text();

    animeData =
    parseCSV(animeText);

    animeData.shift();

    allAnime = animeData
    .filter(r => showAllLicencesSecretMode || r[2] == "1")
    .map(r => r[0]);

    console.time("JSON");

    allProducts =
        (await productsRes.json()).map(
            prepareProduct
        );

    console.timeEnd("JSON");

    allTypes = [...new Set(
        allProducts
        .map(p => p.type)
        .filter(Boolean)
    )].sort();

console.time("FIRST_RENDER");

if(window.location.pathname !== "/"){
    startSearch();
}

console.timeEnd("FIRST_RENDER");

setTimeout(()=>{

    console.time("MENUS");

    buildSidebar();

    buildTopMenus();

    buildLicenceCards();

    handleLicenceRoute();
    
    updateFavoritesButton();

    console.timeEnd("MENUS");

    console.timeEnd("TOTAL");

},0);
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

        const persos = [...new Set(

            allProducts

            .filter(p => p.licence === licence)

            .flatMap(p => p._persos || [])

            .filter(perso =>
                perso &&
                normalizeLicenceKey(perso) !== "divers"
            )

        )].sort();

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

function buildLicenceCards(){

    const grid =
        document.getElementById(
            "licenceCardsGrid"
        );

    const featuredGrid =
        document.getElementById(
            "featuredLicenceCardsGrid"
        );

    if(!grid){
        return;
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
        sortedLicenceRows.map(r => r[0]);

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

    const buildCardHTML = (licence,index,extraClass = "") => `

            <a
                href="/?licence=${encodeURIComponent(licence)}"
                class="licence-card ${extraClass}"
                title="${licence}"
            >

                <img
                    src="/cards/thumbs/Card ${licence}.webp"
                    alt="${licence}"
                    loading="${index < 12 ? "eager" : "lazy"}"
                    fetchpriority="${index < 8 ? "high" : "auto"}"
                >

                <div class="licence-card-title">
                    ${licence}
                </div>

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

    const firstBatchSize = 12;
    const chunkSize = 12;

    const buildCardsHTML = (start,end)=>
        licences
            .slice(start,end)
            .map((licence,index)=>
                buildCardHTML(
                    licence,
                    start + index
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

        if(nextIndex >= licences.length){
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

        const persos = [
            ...(persosByLicence.get(licence) || [])
        ].sort();

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

    allProducts.forEach(p=>{

        if(!p.licence) return;

        const existing =
            licencesMap.get(p.licence);

        const animeRow =
    animeData.find(
        r => r[0] === p.licence
    );

const priority =

    animeRow &&
    animeRow[1]

    ? parseInt(animeRow[1])

    : 999999;

        if(
            !existing ||
            priority < existing.priority
        ){
            licencesMap.set(
                p.licence,
                {
                    name:p.licence,
                    priority
                }
            );
        }
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

    const slug = licence
        .toLowerCase()
        .replaceAll(" ","-");

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
            'type:' + quickTopType,
            `
                <div class="filter-tag">

                    ${quickTopType}

                    <span
                        class="filter-remove"
                        onclick="
                            quickTopType='';
                            startSearch();
                        "
                    >
                        ✕
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

    const searchedPerso =
        searchedLicence
            ? ""
            : findPersoFromSearch(searchText);

    const searchedLicenceKey =
        normalizeLicenceKey(searchedLicence);

    const searchedPersoKey =
        normalizeLicenceKey(searchedPerso);

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

    allResults = allProducts.filter(p=>{

        if(
            routeLicenceFilter &&
            p._licenceKey !==
            routeLicenceKey
        ){
            return false;
        }

        if(
            searchedLicence &&
            p._licenceKey !== searchedLicenceKey
        ){
            return false;
        }

        if(
            searchedPerso &&
            !p._persoKeys.has(searchedPersoKey)
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
            !selectedLicenceSet.has(p.licence)
        ){
            return false;
        }

        const persosForLicence =
            selectedPersosByLicence.get(p.licence);

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
            !searchedPerso
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
                compareText(a.licence,b.licence) ||
                compareText(
                    firstPersoName(a),
                    firstPersoName(b)
                ) ||
                compareText(a.name,b.name)
            );
        }

        if(sort === "perso-desc"){
            return (
                compareText(a.licence,b.licence) ||
                compareText(
                    firstPersoName(b),
                    firstPersoName(a)
                ) ||
                compareText(a.name,b.name)
            );
        }
    });

    displayProducts();

    updateSidebarTypeVisibility();

    updateActiveFilters();
}

function removeFilter(type,value){

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

function displayProducts(){

    const grid =
        document.getElementById(
            "productGrid"
        );

    let html = "";

    allResults.forEach(p=>{

        html += `

            <div class="card">

                <div class="card-image-wrapper">

                    <button
                        class="favorite-btn ${isFavorite(p.url) ? 'active' : ''}"

                        onclick="
                            event.stopPropagation();
                            toggleFavorite('${p.url}')
                        "
                    >
                        ❤
                    </button>

                    <img
                        loading="lazy"
                        src="${p.image}"
                        onclick="
                            openModal('${p.image}',true)
                        "
                    >

                </div>

                <p title="${p.name}">
                      ${p.name}
                </p>

                <div class="price">
                    ${p.price}
                </div>

                <a
                    href="${p.url}"
                    target="_blank"
                    class="amazon-btn"
                >
                    Voir sur Amazon
                </a>

            </div>
        `;
    });

    grid.innerHTML = html;
}

/* MODAL */

let modalZoomAllowed = false;
let modalZoomActive = false;

function openModal(src,allowZoom = false){

    const modalImg =
        document.getElementById("modalImg");

    if(modalImg){
        modalZoomAllowed =
            Boolean(allowZoom);

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

    document
        .getElementById("imageModal")
        .style.display = "flex";
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
}

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

        routeLicenceFilter = "";

        updateSidebarPromoCard("home");

        if(licenceCardsGrid){
            licenceCardsGrid.style.display = "grid";
        }

        document
            .getElementById("featuredLicenceCardsGrid")
            ?.style
            .setProperty("display","grid");

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

        routeLicenceFilter = "";

        updateSidebarPromoCard("catalogue");

        if(licenceCardsGrid){
            licenceCardsGrid.style.display = "none";
        }

        document
            .getElementById("featuredLicenceCardsGrid")
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

            l.toLowerCase()
                .replaceAll(" ","-")
            === slug
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

            buildSidebar();
            buildTopMenus();
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
