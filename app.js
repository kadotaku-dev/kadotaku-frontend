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

    return text.split("\n").map(r =>

        r.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)

        ?.map(c => c.replace(/"/g,"").trim()) || []
    );
}

/* LOAD */

async function loadData(){

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
        await productsRes.json();

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

    typeList.innerHTML = "";
    licenceList.innerHTML = "";

    allTypes.forEach(type=>{

        typeList.innerHTML += `
            <label>

                <input
                    type="checkbox"
                    value="${type}"
                    onchange="startSearch()"
                >

                ${type}

            </label>
        `;
    });


[
    ...getSortedLicences().priority,
    ...getSortedLicences().alphabetical
].forEach(licence=>{
        const persos = [...new Set(

            allProducts

            .filter(p =>
                p.licence === licence &&
                p.perso &&
                p.perso !== "divers"
            )

            .map(p => p.perso)

        )].sort();

        let persosHTML = "";

        persos.forEach(perso=>{

            persosHTML += `

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
            `;
        });

        licenceList.innerHTML += `

            <div class="licence-block">

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
    });
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

    const checkedLicences =
        [...document.querySelectorAll(
            '.licence-checkbox:checked'
        )];

    if(checkedLicences.length === 1){

        goToLicencePage(
            checkedLicences[0].value
        );

        return;
    }

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

    openModal(image);

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

    if(!grid){
        return;
    }

    grid.innerHTML = "";

    const licences = animeData

        .filter(r =>
            r[0] &&
            (
                showAllLicencesSecretMode ||
                r[2] == "1"
            )
        )

        .sort((a,b)=>{

            const favA = Number(a[1]) || 9999;
            const favB = Number(b[1]) || 9999;

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

    licences.forEach(licence=>{

        grid.innerHTML += `

            <a
                href="/?licence=${encodeURIComponent(licence)}"
                class="licence-card"
                title="${licence}"
            >

                <img
                    src="/cards/thumbs/Card ${licence}.webp"
                    alt="${licence}"
                    loading="lazy"
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
    });
}

/* TOP MENUS */

function buildTopMenus(){

    const typesDropdown =
        document.getElementById("typesDropdown");

    const licencesDropdown =
        document.getElementById("licencesDropdown");

        typesDropdown.innerHTML = `
    <div class="dropdown-scroll"></div>
`;

const typesDropdownScroll =
    typesDropdown.querySelector(
        ".dropdown-scroll"
    );

    allTypes.forEach(type=>{

        const licences = [...new Set(

            allProducts

            .filter(p => p.type === type)

            .map(p => p.licence)

        )].sort();

        let submenu = "";

        submenu += `
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
        `;

        licences.forEach(licence=>{

              submenu += `
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
                                      i.value ===
                                      decodeURIComponent(
                                          this.dataset.licence
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
              `;
        });

        typesDropdownScroll.innerHTML += `

            <div class="dropdown-item">

                    <div class="has-submenu">

        <span
            class="top-parent-link"
            data-type="${encodeURIComponent(type)}"

            onclick="
                quickType(
                    decodeURIComponent(
                        this.dataset.type
                    )
                )
            "
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
    });

licencesDropdown.innerHTML = `
    <div class="dropdown-scroll"></div>
`;

const licencesDropdownScroll =
    licencesDropdown.querySelector(
        ".dropdown-scroll"
    );

[
    ...getSortedLicences().priority,
    ...getSortedLicences().alphabetical
].forEach(licence=>{

        const persos = [...new Set(

            allProducts

            .filter(p =>
                p.licence === licence &&
                p.perso &&
                p.perso !== "divers"
            )

            .map(p => p.perso)

        )].sort();

        let submenu = "";

        submenu += `
            <div
                class="dropdown-item"
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
        `;

        persos.forEach(perso=>{

            submenu += `
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
                    ${perso}
                </div>
            `;
        });

        licencesDropdownScroll.innerHTML += `

            <div class="dropdown-item">

                <div class="has-submenu">

                    <span
                        class="top-parent-link"
                        data-licence="${encodeURIComponent(licence)}"

                        onclick="
                            quickLicence(
                                decodeURIComponent(
                                    this.dataset.licence
                                )
                            )
                        "
                    >
                        ${licence}
                    </span>

                    <span class="submenu-arrow"></span>

                </div>

                <div class="submenu">

                    ${submenu}

                </div>

            </div>
        `;
    });
}

function closeTopMenus(){

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

    .filter(l => l.priority === 999999)

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
    maxSlider.value = 500;

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

    maxSlider.value = 500;

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

    window.location.href =
        window.location.hostname === "127.0.0.1"

        ? `/?licence=${encodeURIComponent(licence)}`

        : `/licence/${slug}`;
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
                normalizeText(i.value) === normalizeText(licence)

            togglePersos(i);
        });

    document
        .querySelectorAll(
            '.perso-checkbox'
        )

        .forEach(i => {

            i.checked =
                (
                    i.dataset.licence === licence &&
                    i.value === perso
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
                        maxSlider.value = 500;
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
    maxSlider.value !== "500"
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
                        maxSlider.value = 500;
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
        maxSlider.value !== "500";

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
}

function startSearch(){

    switchHomeToCatalogueView();

    const selectedTypes =

        [...document.querySelectorAll(
            '#typeList input:checked'
        )]

        .map(i => i.value);

    const selectedLicences =

        [...document.querySelectorAll(
            '.licence-checkbox:checked'
        )]

        .map(i => i.value);

    const selectedPersos =

        [...document.querySelectorAll(
            '.perso-checkbox:checked'
        )];

    const displayedFilters =
            new Set();

    function addFilterTag(key,html){

            if(displayedFilters.has(key)){
                return;
            }

            displayedFilters.add(key);

            container.innerHTML += html;
        }

    const searchText =

        document
        .getElementById('searchInput')
        .value
        .toLowerCase();

    const sort =
        document.getElementById(
            'sortSelect'
        ).value;

    const minPrice =
        parseFloat(minSlider.value);

    const maxPrice =
        parseFloat(maxSlider.value);

    allResults = allProducts.filter(p=>{

                if(
            routeLicenceFilter &&
            normalizeLicenceKey(p.licence) !==
            normalizeLicenceKey(routeLicenceFilter)
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
            !selectedTypes.includes(p.type)
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
            !selectedLicences.includes(p.licence)
        ){
            return false;
        }

        const persosForLicence =

            selectedPersos.filter(
                i => i.dataset.licence === p.licence
            );

        if(persosForLicence.length > 0){

            const persoValues =
                persosForLicence.map(i => i.value);

            if(!persoValues.includes(p.perso)){
                return false;
            }
        }

        const price =

            parseFloat(
                p.price
                .replace(/[^\d,]/g,"")
                .replace(",",".")
            ) || 0;

        if(
            price < minPrice ||
            price > maxPrice
        ){
            return false;
        }
        
        if(
            favoritesMode &&
            !isFavorite(p.url)
        ){
            return false;
        }

        if(searchText){

            const txt = (

                p.name + " " +
                p.licence + " " +
                p.type + " " +
                p.perso

            ).toLowerCase();

            if(!txt.includes(searchText)){
                return false;
            }
        }

        return true;
    });

    allResults.sort((a,b)=>{

        const pa =
            parseFloat(
                a.price
                .replace(/[^\d,]/g,"")
                .replace(",",".")
            ) || 0;

        const pb =
            parseFloat(
                b.price
                .replace(/[^\d,]/g,"")
                .replace(",",".")
            ) || 0;

        if(sort === "price-asc"){
            return pa - pb;
        }

        if(sort === "price-desc"){
            return pb - pa;
        }

        if(sort === "licence-asc"){
            return a.licence.localeCompare(
                b.licence
            );
        }

        if(sort === "licence-desc"){
            return b.licence.localeCompare(
                a.licence
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
                            openModal('${p.image}')
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

function openModal(src){

    document
        .getElementById("modalImg")
        .src = src;

    document
        .getElementById("imageModal")
        .style.display = "flex";
}

function closeModal(){

    document
        .getElementById("imageModal")
        .style.display = "none";
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

document
    .getElementById("sliderTrack")

    .addEventListener(
        "click",
        (e)=>{

            const rect =
                e.target
                .getBoundingClientRect();

            const percent =
                (e.clientX - rect.left)
                / rect.width;

            const value =
                Math.round(
                    percent * 500
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

            startSearch();
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

                maxSlider.value = 500;
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

                    openModal('${image}');

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

        document.getElementById(
            "licenceCardsSizeToggle"
        ).style.display = "block";

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

    if(productGrid){
        productGrid.style.display = "grid";
    }

    startSearch();
}

loadData();

let openSubmenuItem = null;
let submenuCloseTimeout = null;

function positionTopSubmenu(item,submenu){

    const rect =
        item.getBoundingClientRect();

    const margin = 8;

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
        rect.top;

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

            if (window.location.pathname === "/") {
    document.getElementById("licenceCardsGrid").style.display = "grid";
    document.getElementById("productGrid").style.display = "none";
    document.getElementById("licenceCardsSizeToggle").style.display = "block";
}

            alert(
                showAllLicencesSecretMode
                    ? "Mode secret activé : toutes les licences sont visibles."
                    : "Mode secret désactivé : seules les licences actives sont visibles."
            );
        }
    });
});
