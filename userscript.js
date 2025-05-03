// ==UserScript==
// @name         Steam Badge Info for Booster Creator with favorites list
// @namespace    http://tampermonkey.net/
// @version      1.11 // Increased version for improved dropdown width
// @description  Injects badge information into the booster creator page using a user-defined ID. Includes a favorites list using local storage and Steam-styled controls with improved dropdown width.
// @author       You
// @match        https://steamcommunity.com/tradingcards/boostercreator/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// ====================================================================
// === USER CONFIGURATION - EDIT THESE VALUES BEFORE SAVING SCRIPT ===
// ====================================================================

// IMPORTANT: Replace the placeholder value below with your actual Steam ID.
// This can be your custom URL name (e.g., 'myprofile') or your SteamID64 (e.g., '76561198012345678').
const USER_STEAM_ID = "client"; // <--- PUT YOUR STEAM ID HERE

// steamsets api key for listing all badge icons
// If you are getting 401 errors, double-check your key on the SteamSets website.
// It's possible the key expired, was revoked, or you copied it incorrectly.
const SteamSetsAPI = ""; // <--- PUT YOUR SteamSets API KEY HERE

// Set this to 'true' if the USER_STEAM_ID you entered is a SteamID64.
// Set this to 'false' if the USER_STEAM_ID you entered is a custom URL name.
const STEAM_ID_IS_STEAMID64 = false; // <--- SET TO true FOR STEAMID64, false FOR CUSTOM URL NAME

// Set this to 'true' to enable detailed logging messages in your browser's console.
// Set this to 'false' to disable all console logs from this script.
const ENABLE_CONSOLE_LOGS = false; // <--- SET TO true OR false FOR LOGGING

// Default sort order for favorites ('appid_asc', 'appid_desc', 'foil_first', 'foil_last')
let currentFavoritesSortOrder = GM_getValue('favoritesSortOrder', 'appid_asc'); // Load saved sort order

// ====================================================================
// === END USER CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS ===
// === YOU UNDERSTAND THE CODE                                     ===
// ====================================================================

(function() {
    'use strict';

    // --- Logging Helper ---
    function log(...args) {
        if (ENABLE_CONSOLE_LOGS) {
            console.log('[Steam Badge Info]', ...args);
        }
    }

    function logError(...args) {
         if (ENABLE_CONSOLE_LOGS) {
            console.error('[Steam Badge Info]', ...args);
        }
    }

    function logWarn(...args) {
         if (ENABLE_CONSOLE_LOGS) {
            console.warn('[Steam Badge Info]', ...args);
        }
    }

    function logTable(data) {
        if (ENABLE_CONSOLE_LOGS) {
            console.log('[Steam Badge Info] Table Data:');
            console.table(data);
        }
    }
     function logDebug(...args) {
        if (ENABLE_CONSOLE_LOGS) {
            console.debug('[Steam Badge Info Debug]', ...args);
        }
    }
     function logAPIData(...args) {
         if (ENABLE_CONSOLE_LOGS) {
             console.log('[Steam Badge Info API Data]', ...args);
         }
     }
    // --- End Logging Helper ---

    const style = `
        .badge-container {
            display: flex;
            gap: 40px;
            margin-top: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
            justify-content: center;
        }

        .badge-list-container, .favorites-container {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
            justify-content: flex-start; /* Align items to the start */
            flex-wrap: wrap;
            align-items: flex-start; /* Align rows to the start */
        }

        .favorites-container {
            margin-top: 20px; /* Space above favorites */
            flex-direction: column; /* Stack controls and items */
        }

        .favorites-controls {
             display: flex;
             gap: 10px;
             margin-bottom: 10px;
             align-items: center;
        }

        .favorites-controls label {
            color: #B8B6B4;
            font-size: 12px;
        }

         /* --- Steam-like Dropdown Styling --- */
        .favorites-controls .btn_grey_black {
            padding: 0 8px; /* Adjust padding */
            height: 24px; /* Adjust height */
            line-height: 24px; /* Center text vertically */
            font-size: 12px; /* Match label font size */
            position: relative; /* Needed for arrow positioning */
            cursor: pointer;
            background: linear-gradient( to right, #333, #444 ); /* Darker gradient */
            border-radius: 3px;
            border: none; /* Remove default border */
            color: #B8B6B4;
            text-shadow: none; /* Remove default text shadow */
            /* Added min-width to ensure text visibility */
            min-width: 150px; /* Adjust as needed based on longest option text */
            display: inline-block; /* Ensure it behaves like a block for width */
        }

        .favorites-controls .btn_grey_black select {
            -webkit-appearance: none; /* Remove default dropdown arrow */
            -moz-appearance: none;
            appearance: none;
            background: transparent; /* Make select background transparent */
            border: none;
            padding: 0;
            margin: 0;
            color: #B8B6B4;
            font-size: 12px;
            cursor: pointer;
            outline: none; /* Remove focus outline */
            width: 100%; /* Take full width of parent button */
            height: 100%; /* Take full height of parent button */
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 2; /* Place select above the custom arrow */
             padding-right: 20px; /* Add padding on the right to make space for the arrow */
        }

        /* Custom arrow */
        .favorites-controls .btn_grey_black::after {
            content: '▼'; /* Unicode down arrow */
            position: absolute;
            top: 50%;
            right: 5px; /* Position arrow */
            transform: translateY(-50%);
            font-size: 8px; /* Smaller arrow */
            color: #B8B6B4;
            pointer-events: none; /* Allow clicks to pass through to select */
            z-index: 1; /* Place arrow below select */
        }

        /* Hover effect for the button */
        .favorites-controls .btn_grey_black:hover {
            background: linear-gradient( to right, #444, #555 ); /* Lighter gradient on hover */
            color: #CFCFCF;
        }

        /* Focus effect for the button */
        .favorites-controls .btn_grey_black:focus-within {
             outline: 1px solid #8BC53F; /* Green outline on focus */
        }

         .favorites-controls .btn_grey_black option {
             background-color: #333; /* Background for dropdown options */
             color: #B8B6B4;
         }

        /* --- End Steam-like Dropdown Styling --- */


        .favorites-items-wrapper {
            display: flex;
            flex-wrap: wrap;
            gap: 20px; /* Gap between items */
            width: 100%; /* Take full width of container */
        }

        .badge-box, .badge-list-box, .favorite-item {
            flex: 0 0 calc(16.666% - 17px); /* Calculate width for 6 items per row, adjusting for gap */
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.1);
            min-width: 100px;
            max-width: 150px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            cursor: pointer; /* Indicate clickable */
            transition: background-color 0.2s ease; /* Smooth hover effect */
        }

         .favorite-item {
             flex: 0 0 calc(16.666% - 17px); /* Ensure 6 items per row */
             cursor: pointer;
         }

        .badge-box:hover, .badge-list-box:hover, .favorite-item:hover {
            background-color: rgba(255, 255, 255, 0.05); /* Subtle hover effect */
        }


        .badge-box.foil, .badge-list-box.foil, .favorite-item.foil {
            background: linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.1) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(0, 0, 0, 0.1) 100%
            );
            animation: shine 3s linear infinite;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 15px rgba(255, 255, 245, 0.1);
        }
        @keyframes shine {
            0% {
                background-position: -200% center;
            }
            100% {
                background-position: 200% center;
            }
        }
        .badge-title, .badge-list-title, .favorite-title {
            margin-bottom: 10px;
            color: #8BC53F;
            font-weight: bold;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
        }
        .badge-image, .badge-list-image, .favorite-image {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
            flex-shrink: 0;
        }
        .badge_empty_circle, .badge_list_empty_circle, .favorite_empty_circle {
            width: 80px;
            height: 80px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 50%;
            margin: 0 auto;
             flex-shrink: 0;
        }

        .badge-link, .badge-list-link, .favorite-link {
            text-decoration: none;
            color: inherit;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: 80px;
            box-sizing: border-box;
            margin-bottom: 5px;
        }

        .badge-level, .badge-list-scarcity, .favorite-appid {
            margin-top: 10px;
            color: #B8B6B4;
            font-size: 12px;
        }
        .badge-link:hover, .badge-list-link:hover {
            opacity: 0.8;
        }
        .foil .badge-title, .foil .badge-list-title, .foil .favorite-title {
            color: #CFE6F5;
            text-shadow: 0 0 5px rgba(207, 230, 245, 0.5);
        }
        .badge-progress {
            margin-top: 8px;
            color: #B8B6B4;
            font-size: 12px;
        }
        .badge-sets {
            margin-top: 4px;
            color: #8BC53F;
            font-size: 12px;
        }
        .foil .badge-sets {
            color: #CFE6F5;
        }
        .badge-list-scarcity, .favorite-appid {
            margin-top: auto;
            font-size: 11px;
            color: #B8B6B4;
        }

    `;

    function addStyle(css) {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }

    function getAppId() {
        const url = window.location.href;
        const match = url.match(/\d+$/);
        return match ? match[0] : null;
    }

    function parseBadgeData(html, isFoil, userId, isSteamId64, appId) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const badgeImage = doc.querySelector('.badge_info_image .badge_icon');
        const badgeName = doc.querySelector('.badge_info_title');
        const badgeLevel = doc.querySelector('.badge_info_description');

        const cardElements = doc.querySelectorAll('.badge_card_set_card');
        const cardQuantities = [];
        const cardInfo = []; // To store card name and quantity together

        cardElements.forEach(cardElement => {
            const qtyElement = cardElement.querySelector('.badge_card_set_text_qty');
            const nameElement = cardElement.querySelector('.badge_card_set_text_cardname');

            const quantityMatch = qtyElement ? qtyElement.textContent.match(/\((\d+)\)/) : null;
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 0; // Treat empty quantity as 0
            cardQuantities.push(quantity);

            const name = nameElement ? nameElement.textContent.trim() : 'Unknown Card';
            cardInfo.push({ name: name, quantity: quantity });
        });

        log(`${isFoil ? 'Foil' : 'Regular'} Badge Cards Found:`);
        logTable(cardInfo);

        const totalCards = cardElements.length;
        const completeSets = cardQuantities.length > 0 ? Math.min(...cardQuantities) : 0;
        const ownedCards = cardQuantities.filter(qty => qty > 0).length;

        log(`${isFoil ? 'Foil' : 'Regular'} Badge Summary:`);
        log(`  Total Cards in Set: ${totalCards}`);
        log(`  Owned Card Types: ${ownedCards}`);
        log(`  Complete Sets: ${completeSets}`);

        const levelMatch = badgeLevel ? badgeLevel.textContent.match(/Level (\d+)/) : null;

        // Construct the badge URL using the provided ID and type
        const badgeBaseUrl = userId ? `https://steamcommunity.com/${isSteamId64 ? 'profiles' : 'id'}/${userId}/gamecards/${appId}` : null;
        const badgeUrl = badgeBaseUrl ? `${badgeBaseUrl}${isFoil ? '?border=1' : ''}` : null;

        return {
            imageUrl: badgeImage ? badgeImage.src : null,
            name: badgeName ? badgeName.textContent.trim() : null,
            level: levelMatch ? levelMatch[1] : null,
            badgeUrl: badgeUrl,
            cardProgress: {
                owned: ownedCards,
                total: totalCards,
                completeSets: completeSets
            }
        };
    }

    function createBadgeElement(badgeData, isFoil) {
        const badgeBox = document.createElement('div');
        badgeBox.className = `badge-box ${isFoil ? 'foil' : ''}`;

        const title = document.createElement('div');
        title.className = 'badge-title';
        title.textContent = isFoil ? 'Foil Badge' : 'Regular Badge';
        badgeBox.appendChild(title);

        const link = document.createElement('a');
        link.className = 'badge-link';
        if (badgeData.badgeUrl) {
            link.href = badgeData.badgeUrl;
        } else {
             link.style.cursor = 'default';
        }

        if (badgeData.imageUrl) {
            const image = document.createElement('img');
            image.className = 'badge-image';
            image.src = badgeData.imageUrl;
            image.alt = badgeData.name || 'Badge Image'; // Add alt text
            link.appendChild(image);
        } else {
            const emptyCircle = document.createElement('div');
            emptyCircle.className = 'badge_empty_circle';
            link.appendChild(emptyCircle);
        }

        badgeBox.appendChild(link);

        if (badgeData.level) {
            const level = document.createElement('div');
            level.className = 'badge-level';
            level.textContent = `Level ${badgeData.level}`;
            badgeBox.appendChild(level);
        }

        if (badgeData.cardProgress) {
            const progress = document.createElement('div');
            progress.className = 'badge-progress';
            if (badgeData.cardProgress.total > 0) {
                 if (badgeData.cardProgress.owned === 0 || badgeData.cardProgress.owned === badgeData.cardProgress.total) {
                    progress.textContent = '';
                } else {
                    progress.textContent = `${badgeData.cardProgress.owned}/${badgeData.cardProgress.total} Cards`;
                }

                if (badgeData.cardProgress.completeSets > 0) {
                    const sets = document.createElement('div');
                    sets.className = 'badge-sets';
                    sets.textContent = `${badgeData.cardProgress.completeSets} Complete ${badgeData.cardProgress.completeSets === 1 ? 'Set' : 'Sets'}`;
                    progress.appendChild(sets);
                }
            } else {
                 progress.textContent = 'No cards in this set';
            }

            badgeBox.appendChild(progress);
        }

        return badgeBox;
    }

    function createBadgeListItem(badgeData) {
        const badgeListBox = document.createElement('div');
        badgeListBox.className = `badge-list-box ${badgeData.isFoil ? 'foil' : ''}`;
        // Store data attributes for easy access when clicking
        badgeListBox.dataset.appid = badgeData.appId;
        badgeListBox.dataset.badgeImage = badgeData.badgeImage;
        badgeListBox.dataset.isFoil = badgeData.isFoil;
        badgeListBox.dataset.name = badgeData.name || 'Unknown Badge';

        const title = document.createElement('div');
        title.className = 'badge-list-title';
        title.textContent = badgeData.name || 'Unknown Badge';
        badgeListBox.appendChild(title);

        const link = document.createElement('a');
        link.className = 'badge-list-link';
        link.style.cursor = 'pointer'; // Make it look clickable

        let badgeImageUrl = null;
        if (badgeData.appId && badgeData.badgeImage &&
            (typeof badgeData.appId === 'number' || typeof badgeData.appId === 'string') &&
            typeof badgeData.badgeImage === 'string' && badgeData.badgeImage.length > 0) {

            badgeImageUrl = `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/items/${badgeData.appId}/${badgeData.badgeImage}`;
            badgeListBox.dataset.imageUrl = badgeImageUrl; // Store image URL

            const image = document.createElement('img');
            image.className = 'badge-list-image';
            image.src = badgeImageUrl;
            image.alt = badgeData.name || 'Badge Image';
            image.onerror = () => {
                logError(`Failed to load constructed image for badge list item: ${badgeData.name} from URL: ${badgeImageUrl}`);
                link.innerHTML = '';
                const emptyCircle = document.createElement('div');
                emptyCircle.className = 'badge_list_empty_circle';
                link.appendChild(emptyCircle);
                 badgeListBox.dataset.imageUrl = ''; // Clear failed image URL
            };
            link.appendChild(image);

        } else {
            const emptyCircle = document.createElement('div');
            emptyCircle.className = 'badge_list_empty_circle';
            link.appendChild(emptyCircle);
             badgeListBox.dataset.imageUrl = ''; // Store empty image URL
        }

        badgeListBox.appendChild(link);

        // Use badgeData.scarcity directly from the API response
        if (badgeData.scarcity !== undefined && badgeData.scarcity !== null) {
            const scarcity = document.createElement('div');
            scarcity.className = 'badge-list-scarcity';
             // Only show scarcity for non-foil badges as foil scarcity isn't directly comparable
             if (!badgeData.isFoil) {
                 scarcity.textContent = `Scarcity: ${badgeData.scarcity}`;
             } else {
                 scarcity.textContent = `Foil Badge`; // Indicate it's foil instead of scarcity
                 scarcity.style.color = '#CFE6F5';
             }
            badgeListBox.appendChild(scarcity);
        } else {
            const scarcity = document.createElement('div');
            scarcity.className = 'badge-list-scarcity';
            scarcity.textContent = badgeData.isFoil ? 'Foil Badge' : 'Scarcity: N/A';
             scarcity.style.fontStyle = 'italic';
             scarcity.style.color = badgeData.isFoil ? '#CFE6F5' : '#666';
            badgeListBox.appendChild(scarcity);
        }


        // Add click listener to save/remove from favorites
        badgeListBox.addEventListener('click', () => {
            toggleFavorite({
                appId: badgeData.appId,
                name: badgeData.name || 'Unknown Badge',
                imageUrl: badgeListBox.dataset.imageUrl, // Use stored URL
                isFoil: badgeData.isFoil
            });
        });


        return badgeListBox;
    }

     function createFavoriteItemElement(favoriteData) {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = `favorite-item ${favoriteData.isFoil ? 'foil' : ''}`;
        favoriteItem.dataset.appid = favoriteData.appId;
        favoriteItem.dataset.isFoil = favoriteData.isFoil;

        const title = document.createElement('div');
        title.className = 'favorite-title';
        title.textContent = favoriteData.name || `App ${favoriteData.appId}`;
        favoriteItem.appendChild(title);

        const link = document.createElement('a');
        link.className = 'favorite-link';
        link.href = `#${favoriteData.appId}`; // Set the URL hash
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            // Change the URL hash without a full page reload
            window.location.hash = `${favoriteData.appId}`;
             // Manually trigger the update as hash change might not trigger MutationObserver reliably across all browsers/frameworks
            setTimeout(updateBadgeInfo, 100); // Add a small delay
        });


        if (favoriteData.imageUrl) {
            const image = document.createElement('img');
            image.className = 'favorite-image';
            image.src = favoriteData.imageUrl;
            image.alt = favoriteData.name || 'Badge Image';
             image.onerror = () => {
                logError(`Failed to load image for favorite item: ${favoriteData.name} from URL: ${favoriteData.imageUrl}`);
                link.innerHTML = ''; // Clear any failed image
                const emptyCircle = document.createElement('div');
                emptyCircle.className = 'favorite_empty_circle';
                link.appendChild(emptyCircle);
            };
            link.appendChild(image);
        } else {
            const emptyCircle = document.createElement('div');
            emptyCircle.className = 'favorite_empty_circle';
            link.appendChild(emptyCircle);
        }

        favoriteItem.appendChild(link);

        const appidElement = document.createElement('div');
        appidElement.className = 'favorite-appid';
        appidElement.textContent = `App ID: ${favoriteData.appId}`;
         if (favoriteData.isFoil) {
             const foilIndicator = document.createElement('span');
             foilIndicator.textContent = ' (Foil)';
             foilIndicator.style.color = '#CFE6F5';
             appidElement.appendChild(foilIndicator);
         }
        favoriteItem.appendChild(appidElement);

         // Add click listener to remove from favorites when clicked again
        favoriteItem.addEventListener('click', (event) => {
             // Only remove if the click wasn't on the link itself
            if (!event.target.closest('.favorite-link')) {
                 toggleFavorite({
                     appId: favoriteData.appId,
                     name: favoriteData.name,
                     imageUrl: favoriteData.imageUrl,
                     isFoil: favoriteData.isFoil
                 });
            }
        });


        return favoriteItem;
    }


     function getFavorites() {
        try {
            const favoritesJson = GM_getValue('steamBadgeFavorites', '[]');
            return JSON.parse(favoritesJson);
        } catch (e) {
            logError('Error parsing favorites from local storage:', e);
            return [];
        }
    }

    function saveFavorites(favorites) {
        try {
            GM_setValue('steamBadgeFavorites', JSON.stringify(favorites));
            logDebug('Favorites saved:', favorites);
        } catch (e) {
            logError('Error saving favorites to local storage:', e);
        }
    }

    function toggleFavorite(badgeData) {
        logDebug('Toggling favorite:', badgeData);
        const favorites = getFavorites();
        const index = favorites.findIndex(fav =>
            fav.appId === badgeData.appId && fav.isFoil === badgeData.isFoil
        );

        if (index > -1) {
            // Item is already in favorites, remove it
            favorites.splice(index, 1);
            log(`Removed favorite: App ID ${badgeData.appId}, Foil: ${badgeData.isFoil}`);
        } else {
            // Item is not in favorites, add it
             // Ensure we don't add duplicates based on appId and isFoil
             if (!favorites.some(fav => fav.appId === badgeData.appId && fav.isFoil === badgeData.isFoil)) {
                 favorites.push(badgeData);
                 log(`Added favorite: App ID ${badgeData.appId}, Foil: ${badgeData.isFoil}`);
             } else {
                 logDebug(`Attempted to add duplicate favorite: App ID ${badgeData.appId}, Foil: ${badgeData.isFoil}`);
             }
        }

        saveFavorites(favorites);
        displayFavorites(); // Refresh the displayed list
    }

     function sortFavorites(favorites, order) {
        switch (order) {
            case 'appid_asc':
                return favorites.sort((a, b) => parseInt(a.appId) - parseInt(b.appId));
            case 'appid_desc':
                return favorites.sort((a, b) => parseInt(b.appId) - parseInt(a.appId));
            case 'foil_first':
                return favorites.sort((a, b) => {
                    if (a.isFoil !== b.isFoil) {
                        return a.isFoil ? 1 : -1; // false (non-foil) comes before true (foil)
                    }
                    return parseInt(a.appId) - parseInt(b.appId); // Secondary sort by appid
                });
            case 'foil_last':
                 return favorites.sort((a, b) => {
                    if (a.isFoil !== b.isFoil) {
                        return a.isFoil ? -1 : 1; // true (foil) comes before false (non-foil)
                    }
                    return parseInt(a.appId) - parseInt(b.appId); // Secondary sort by appid
                });
            default:
                return favorites; // Default to appid_asc if unknown order
        }
     }


    function displayFavorites() {
        logDebug('Displaying favorites...');
        const favoritesContainer = document.querySelector('.favorites-container');
        if (!favoritesContainer) {
            logWarn('Favorites container not found. Cannot display favorites.');
            return;
        }

        // Find or create the items wrapper
        let itemsWrapper = favoritesContainer.querySelector('.favorites-items-wrapper');
        if (!itemsWrapper) {
            itemsWrapper = document.createElement('div');
            itemsWrapper.className = 'favorites-items-wrapper';
            favoritesContainer.appendChild(itemsWrapper);
        }
         itemsWrapper.innerHTML = ''; // Clear current items

        const favorites = getFavorites();
         const sortedFavorites = sortFavorites([...favorites], currentFavoritesSortOrder); // Sort a copy

        if (sortedFavorites.length === 0) {
            itemsWrapper.textContent = 'No favorites added yet.';
             itemsWrapper.style.color = '#B8B6B4';
             itemsWrapper.style.textAlign = 'center';
             itemsWrapper.style.width = '100%';
             itemsWrapper.style.marginTop = '10px';
        } else {
             itemsWrapper.style.color = ''; // Reset styles
             itemsWrapper.style.textAlign = '';
             itemsWrapper.style.width = '';
             itemsWrapper.style.marginTop = '';
            sortedFavorites.forEach(fav => {
                itemsWrapper.appendChild(createFavoriteItemElement(fav));
            });
        }
         logDebug(`Displayed ${sortedFavorites.length} favorites.`);
    }


    async function fetchAndDisplayBadgeList(appId) {
         if (!SteamSetsAPI || SteamSetsAPI === "ss_YOUR_API_KEY") {
            logWarn("SteamSets API key not configured or is placeholder. Skipping badge list fetch.");
            let badgeListContainer = document.querySelector('.badge-list-container');
            if (!badgeListContainer) {
                 badgeListContainer = document.createElement('div');
                 badgeListContainer.className = 'badge-list-container';
                 const target = document.querySelector('.booster_creator_left');
                  if (target) {
                     target.insertAdjacentElement('afterend', badgeListContainer);
                 }
            }
            if (badgeListContainer) {
                 badgeListContainer.innerHTML = '';
                 badgeListContainer.textContent = 'SteamSets API key is not set. Badge list unavailable.';
                 badgeListContainer.style.color = 'orange';
                 badgeListContainer.style.textAlign = 'center';
            }
            return;
        }

        log(`Fetching badge list for App ID: ${appId} from SteamSets API.`);

        let badgeListContainer = document.querySelector('.badge-list-container');
         if (!badgeListContainer) {
             badgeListContainer = document.createElement('div');
             badgeListContainer.className = 'badge-list-container';
             const target = document.querySelector('.booster_creator_left');
              if (target) {
                 target.insertAdjacentElement('afterend', badgeListContainer);
             } else {
                 logWarn('Target element .booster_creator_left not found for badge list container insertion.');
                 return;
             }
         }

        badgeListContainer.innerHTML = ''; // Clear previous content
        // Temporarily add a loading message
        badgeListContainer.textContent = 'Loading available badges...';


        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.steamsets.com/v1/app.listBadges',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SteamSetsAPI}`
            },
            data: JSON.stringify({
                appId: parseInt(appId) // Ensure appId is an integer
            }),
            onload: response => {
                log(`SteamSets API response status: ${response.status}`);
                badgeListContainer.innerHTML = ''; // Clear loading message

                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);

                        if (data && data.badges && Array.isArray(data.badges)) {
                            log(`Fetched ${data.badges.length} badges from SteamSets API.`);

                            // Sort badges (non-foil by scarcity asc, then foil by rarity asc)
                            const sortedBadges = data.badges.sort((a, b) => {
                                if (a.isFoil !== b.isFoil) {
                                    return a.isFoil ? 1 : -1; // non-foil first
                                }
                                // For same type (foil or non-foil), sort by scarcity ascending
                                // Use rarity for foil as scarcity might not be available or comparable
                                if (a.isFoil) {
                                     return (a.rarity || Infinity) - (b.rarity || Infinity);
                                }
                                return (a.scarcity || Infinity) - (b.scarcity || Infinity);
                            });


                            if (sortedBadges.length > 0) {
                                log(`Displaying all available badges (${sortedBadges.length}):`);
                                sortedBadges.forEach(badge => {
                                    // Add appId to the badge data before creating the item
                                    badge.appId = appId;
                                    badgeListContainer.appendChild(createBadgeListItem(badge));
                                });
                            } else {
                                badgeListContainer.textContent = 'No badges found for this app via SteamSets API.';
                            }

                        } else {
                            logError('SteamSets API response did not contain expected badge data structure:', data);
                            badgeListContainer.textContent = 'Error fetching badge list: Invalid data format.';
                             badgeListContainer.style.color = 'orange';
                             badgeListContainer.style.textAlign = 'center';
                        }
                    } catch (e) {
                        logError('Error parsing SteamSets API response:', e);
                        badgeListContainer.textContent = 'Error fetching badge list: Invalid JSON response.';
                         badgeListContainer.style.color = 'orange';
                         badgeListContainer.style.textAlign = 'center';
                    }
                } else if (response.status === 401) {
                     logError(`SteamSets API request failed with status 401 (Unauthorized). Check your API key.`, response.responseText);
                     badgeListContainer.innerHTML = '';
                     badgeListContainer.textContent = 'SteamSets API Error: Unauthorized (401). Please check your API key configuration.';
                     badgeListContainer.style.color = 'red';
                     badgeListContainer.style.textAlign = 'center';
                }
                else {
                     logError(`SteamSets API request failed with status: ${response.status}`, response.responseText);
                     let errorMessage = `Error fetching badge list. Status: ${response.status}.`;
                     if (response.responseText) {
                         try {
                              const errorData = JSON.parse(response.responseText);
                              if (errorData.message) {
                                   errorMessage += ` Message: ${errorData.message}`;
                              }
                         } catch (e) {
                             // Ignore JSON parsing error if responseText is not JSON
                         }
                     }
                    badgeListContainer.innerHTML = '';
                    badgeListContainer.textContent = errorMessage;
                     badgeListContainer.style.color = 'orange';
                     badgeListContainer.style.textAlign = 'center';
                }
            },
            onerror: (error) => {
                logError(`SteamSets API request failed:`, error);
                badgeListContainer.innerHTML = ''; // Clear loading message
                badgeListContainer.textContent = `Network error fetching badge list.`;
                 badgeListContainer.style.color = 'red';
                 badgeListContainer.style.textAlign = 'center';
            }
        });
    }


    // Main function to fetch and display badge info
    async function updateBadgeInfo() {
        const appId = getAppId();
        if (!appId) {
            logWarn('Could not get App ID from URL. Displaying favorites only.');
            // If no App ID, clear badge containers and only show favorites
            clearBadgeContainers(false); // Don't remove favorites container
            addFavoritesContainerWithControls(); // Ensure favorites container is present
            displayFavorites();
            return;
        }

        const userId = USER_STEAM_ID;
        const isSteamId64 = STEAM_ID_IS_STEAMID64;

        if (userId === "REPLACE_WITH_YOUR_STEAM_ID" || SteamSetsAPI === "ss_YOUR_API_KEY") {
            logError("Please update the USER_STEAM_ID and/or SteamSetsAPI variables in the script.");
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: red; font-weight: bold; margin-top: 20px; text-align: center;';
            errorDiv.textContent = "Steam Badge Info Injector: Please edit the script and update the configuration variables.";
            const target = document.querySelector('.booster_creator_left');
            if (target) {
                 target.insertAdjacentElement('afterend', errorDiv);
            } else {
                 document.body.prepend(errorDiv);
            }
            clearBadgeContainers(false); // Clear any old containers except favorites
            addFavoritesContainerWithControls(); // Ensure favorites container is present
            displayFavorites(); // Still show favorites if available
            return;
        }

        // Remove existing containers before adding new ones (except favorites)
        clearBadgeContainers(true); // Remove badge containers

        log(`Fetching badge data for App ID: ${appId} and User ID: ${userId} (Type: ${isSteamId64 ? 'SteamID64' : 'Custom ID'})`);

        // Fetch and display the list of available badges first
        fetchAndDisplayBadgeList(appId);

        // Create and insert the main badge container
        const container = document.createElement('div');
        container.className = 'badge-container';
        container.textContent = 'Loading your badge info...'; // Loading state


        const target = document.querySelector('.booster_creator_left');
         if (!target) {
            logWarn('Target element .booster_creator_left not found. Main badge container not inserted.');
             // Still display favorites even if main container fails
             addFavoritesContainerWithControls(); // Ensure favorites container is present
             displayFavorites();
             return;
        }

        // Create and insert the favorites container if it doesn't exist
        addFavoritesContainerWithControls();


        // Insert the main container after the badge list container
         const listContainerCheck = document.querySelector('.badge-list-container');
         if (listContainerCheck) {
            listContainerCheck.insertAdjacentElement('afterend', container); // Insert main container after list
         } else {
            // Fallback if list container wasn't added
            target.insertAdjacentElement('afterend', container);
         }


         // Always display favorites when updateBadgeInfo runs
         displayFavorites();


        // Construct URLs using the provided user ID and type
        const userPath = isSteamId64 ? 'profiles' : 'id';
        const regularUrl = `https://steamcommunity.com/${userPath}/${userId}/gamecards/${appId}`;
        const foilUrl = `https://steamcommunity.com/${userPath}/${userId}/gamecards/${appId}?border=1`;

        Promise.all([
            new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: regularUrl,
                    onload: response => {
                        log(`Regular badge request status: ${response.status}`);
                        resolve(parseBadgeData(response.responseText, false, userId, isSteamId64, appId));
                    },
                    onerror: (error) => {
                         logError(`Error loading regular badge:`, error);
                         resolve({ imageUrl: null, name: 'Error loading regular badge', level: null, badgeUrl: regularUrl, cardProgress: null });
                    }
                });
            }),
            new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: foilUrl,
                    onload: response => {
                        log(`Foil badge request status: ${response.status}`);
                        resolve(parseBadgeData(response.responseText, true, userId, isSteamId64, appId));
                    },
                    onerror: (error) => {
                        logError(`Error loading foil badge:`, error);
                        resolve({ imageUrl: null, name: 'Error loading foil badge', level: null, badgeUrl: foilUrl, cardProgress: null });
                    }
                });
            })
        ]).then(([regularBadge, foilBadge]) => {
            container.innerHTML = ''; // Clear loading message
            container.appendChild(createBadgeElement(regularBadge, false));
            container.appendChild(createBadgeElement(foilBadge, true));

        }).catch(error => {
             logError('Error in Promise.all fetching badge data:', error);
             container.innerHTML = ''; // Clear loading message
             container.textContent = 'Error loading your badge info.';
        });
    }

     function clearBadgeContainers(removeFavorites = false) {
         const existingMainContainer = document.querySelector('.badge-container');
         if (existingMainContainer) {
             existingMainContainer.remove();
         }
         const existingListContainer = document.querySelector('.badge-list-container');
         if (existingListContainer) {
             existingListContainer.remove();
         }
         if (removeFavorites) {
              const existingFavoritesContainer = document.querySelector('.favorites-container');
              if (existingFavoritesContainer) {
                  existingFavoritesContainer.remove();
              }
         }
         const existingError = document.querySelector('div[style*="color: red"]');
         if(existingError) {
             existingError.remove();
         }
     }

      function addFavoritesContainerWithControls() {
         let favoritesContainer = document.querySelector('.favorites-container');
         if (!favoritesContainer) {
              favoritesContainer = document.createElement('div');
              favoritesContainer.className = 'favorites-container';

              // Add sort controls
              const controlsDiv = document.createElement('div');
              controlsDiv.className = 'favorites-controls';

              const label = document.createElement('label');
              label.textContent = 'Sort Favorites:';
              label.htmlFor = 'favorites-sort';
              controlsDiv.appendChild(label);

              // Create the button wrapper for the select
              const selectWrapper = document.createElement('div');
              selectWrapper.className = 'btn_grey_black'; // Apply Steam button class

              const select = document.createElement('select');
              select.id = 'favorites-sort';
              select.innerHTML = `
                 <option value="appid_asc">App ID (Asc)</option>
                 <option value="appid_desc">App ID (Desc)</option>
                 <option value="foil_first">Foil Last</option>
                 <option value="foil_last">Foil First</option>
              `;
              select.value = currentFavoritesSortOrder; // Set initial value
              select.addEventListener('change', (event) => {
                  currentFavoritesSortOrder = event.target.value;
                  GM_setValue('favoritesSortOrder', currentFavoritesSortOrder); // Save sort order
                  displayFavorites(); // Redraw favorites with new sort order
              });
              selectWrapper.appendChild(select); // Append select inside the button wrapper
              controlsDiv.appendChild(selectWrapper); // Append button wrapper to controls

              favoritesContainer.appendChild(controlsDiv);

              // Find a suitable insertion point
              const mainContainer = document.querySelector('.badge-container');
              const listContainer = document.querySelector('.badge-list-container');
              const target = document.querySelector('.booster_creator_left');

              if (mainContainer) {
                  mainContainer.insertAdjacentElement('afterend', favoritesContainer);
              } else if (listContainer) {
                  listContainer.insertAdjacentElement('afterend', favoritesContainer);
              } else if (target) {
                  target.insertAdjacentElement('afterend', favoritesContainer);
              } else {
                  logWarn('Could not find insertion point for favorites container.');
                  return; // Don't proceed if no target found
              }
              logDebug('Favorites container and controls re-added.');
         } else {
             // If container exists, just ensure the sort select value is correct
              const sortSelect = favoritesContainer.querySelector('#favorites-sort');
              if (sortSelect) {
                  sortSelect.value = currentFavoritesSortOrder;
              }
         }
     }


    // --- Initial Run and Observers ---

    addStyle(style);

    // Use a small delay to allow the page structure to load
    setTimeout(updateBadgeInfo, 500);

    // Use MutationObserver to detect URL changes within the page
    // Observe the body for subtree and child list changes to catch SPA navigation
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        // Check if the appId part of the URL has changed
        const lastAppId = lastUrl.match(/\d+$/);
        const currentAppId = currentUrl.match(/\d+$/);

        const appIdChanged = (lastAppId && currentAppId && lastAppId[0] !== currentAppId[0]) ||
                             (!lastAppId && currentAppId) ||
                             (lastAppId && !currentAppId);

        if (currentUrl !== lastUrl && appIdChanged) {
            lastUrl = currentUrl;
            log(`URL changed, App ID updated. Updating badge info.`);
            // Add a small delay before updating to ensure the page structure is ready
            setTimeout(updateBadgeInfo, 200);
        } else if (currentUrl !== lastUrl && !appIdChanged) {
             // If URL changed but App ID is the same (e.g., hash change for something else),
             // just re-display favorites in case the container was removed by page script.
             log(`URL changed, but App ID is the same. Redisplaying favorites.`);
             lastUrl = currentUrl; // Still update lastUrl
             // Ensure the favorites container exists before trying to display
             if (!document.querySelector('.favorites-container')) {
                 logDebug('Favorites container missing during non-AppID URL change, attempting to re-add.');
                 addFavoritesContainerWithControls(); // Re-add container if necessary
             }
             setTimeout(displayFavorites, 100); // Always try to display favorites
        } else if (currentUrl === lastUrl) {
             // Check if the favorites container needs to be re-added
             if (!document.querySelector('.favorites-container')) {
                 logDebug('Favorites container missing, re-adding.');
                 addFavoritesContainerWithControls(); // Re-add container and controls
                 displayFavorites(); // Populate the re-added container
             }
        }
    });

    // Start observing the document body
    observer.observe(document.body, { subtree: true, childList: true });

    // Also try to run updateBadgeInfo on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        log('DOMContentLoaded event fired.');
        setTimeout(updateBadgeInfo, 300);
    });

    // Initial display of favorites on load
    setTimeout(() => {
         addFavoritesContainerWithControls(); // Ensure container is present early
         displayFavorites();
    }, 100);


})();
