const API_URL =
"https://kadotaku-backend-production.up.railway.app";

const animeSheetURL =
"https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=licences";

let allProducts = [];
let allAnime = [];
let animeData = [];
let allTypes = [];
let allResults = [];

let waifuMode = false;

let quickTopType = "";

let favorites = JSON.parse(
    localStorage.getItem(
        'kadotaku_favorites'
    ) || '[]'
);

let favoritesMode = false;

function toggleWaifuMode(){

    waifuMode = !waifuMode;

    const button =
        document.getElementById('waifuButton');

    if(waifuMode){

        button.classList.add('active');

        button.textContent =
            'Mode Waifu Activé';

    } else {

        button.classList.remove('active');

        button.textContent =
            'Mode Waifu Désactivé';
    }

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
        .filter(r => r[2] == "1")
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

    startSearch();

    console.timeEnd("FIRST_RENDER");

    setTimeout(()=>{

        console.time("MENUS");

        buildSidebar();

        buildTopMenus();
        
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
                            togglePersos(this);
                            startSearch();
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

/* TOP MENUS */

function buildTopMenus(){

    const typesDropdown =
        document.getElementById("typesDropdown");

    const licencesDropdown =
        document.getElementById("licencesDropdown");

    allTypes.forEach(type=>{

        const licences = [...new Set(

            allProducts

            .filter(p => p.type === type)

            .map(p => p.licence)

        )].sort();

        let submenu = "";

        licences.forEach(licence=>{

              submenu += `
                  <div
                      class="dropdown-item"

                      data-type="${encodeURIComponent(type)}"

                      data-licence="${encodeURIComponent(licence)}"

                      onclick="

                          clearMainFilters();

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
                      "
                  >
                      ${licence}
                  </div>
              `;
        });

        typesDropdown.innerHTML += `

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
                    )"
                >
                    ${perso}
                </div>
            `;
        });

        licencesDropdown.innerHTML += `

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

function clearAllFilters(){

    clearMainFilters();

    waifuMode = false;

    const button =
        document.getElementById(
            'waifuButton'
        );

    button.classList.remove('active');

    button.textContent =
        'Mode Waifu Désactivé';

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

    clearMainFilters();

    quickTopType = type;

    startSearch();

    closeTopMenus();
}

function quickLicence(licence){

    
    clearMainFilters();
    
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

    startSearch();
    closeTopMenus();
}

function quickPerso(licence,perso){

    clearMainFilters();
    
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
}

function updateActiveFilters(){

    const container =
        document.getElementById(
            'activeFilters'
        );

    container.innerHTML = '';

    if(quickTopType){

        container.innerHTML += `
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
        `;
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

        container.innerHTML += `
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
        `;
    });

    selectedLicences.forEach(i=>{

        container.innerHTML += `
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
        `;
    });

    selectedPersos.forEach(i=>{

        container.innerHTML += `
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
        `;
    });

    if(waifuMode){

        container.innerHTML += `
            <div class="filter-tag">

                Waifu

                <span
                    class="filter-remove"
                    onclick="toggleWaifuMode()"
                >
                    ✕
                </span>

            </div>
        `;
    }

          const hasFilters =

          selectedTypes.length ||
          selectedLicences.length ||
          selectedPersos.length ||
          quickTopType ||
          waifuMode ||
          favoritesMode;

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

function startSearch(){

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
    
    updateActiveFilters();
}

function removeFilter(type,value){

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

loadData();