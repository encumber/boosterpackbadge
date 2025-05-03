// ==UserScript==
// @name         Steam Badges for Booster Packs
// @namespace    https://github.com/encumber/boosterpackbadge
// @version      1.2
// @description  Injects badge information into the booster creator page
// @author       Nitoned
// @match        https://steamcommunity.com/tradingcards/boostercreator/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// ====================================================================
// === USER CONFIGURATION - EDIT THESE VALUES BEFORE SAVING SCRIPT ===
// ====================================================================

// Set this to 'true' if the USER_STEAM_ID you entered is a SteamID64.
// Set this to 'false' if the USER_STEAM_ID you entered is a custom URL name.
const STEAM_ID_IS_STEAMID64 = false; // <--- SET TO true FOR STEAMID64, false FOR CUSTOM URL NAME

// IMPORTANT: Replace the placeholder value below with your actual Steam ID.
// This can be your custom URL name (e.g., 'myprofile') or your SteamID64 (e.g., '76561198012345678').
const USER_STEAM_ID = ""; // <--- PUT YOUR STEAM ID HERE

// steamsets api key for listing all badge icons https://steamsets.com/settings/developer-apps
const SteamSetsAPI = "";


// Set this to 'true' to enable detailed logging messages in your browser's console.
// Set this to 'false' to disable all console logs from this script.
const ENABLE_CONSOLE_LOGS = false; // <--- SET TO true OR false FOR LOGGING

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

        .badge-list-container {
            display: flex;
            gap: 20px; /* Smaller gap for the list */
            margin-bottom: 20px; /* Space above the main container */
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
            justify-content: center;
            flex-wrap: wrap; /* Allow wrapping if needed */
        }

        .badge-box, .badge-list-box {
            flex: 1;
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.1);
            min-width: 100px; /* Minimum width for list items */
            max-width: 150px; /* Maximum width for list items */
            box-sizing: border-box; /* Include padding and border in width */
            display: flex; /* Use flexbox for vertical alignment */
            flex-direction: column; /* Stack children vertically */
            justify-content: space-between; /* Distribute space */
            align-items: center; /* Center items horizontally */
        }

        .badge-box.foil, .badge-list-box.foil {
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
        .badge-title, .badge-list-title {
            margin-bottom: 10px;
            color: #8BC53F;
            font-weight: bold;
            font-size: 14px; /* Smaller font for list titles */
            overflow: hidden; /* Hide overflow text */
            text-overflow: ellipsis; /* Add ellipsis if text overflows */
            white-space: nowrap; /* Prevent wrapping */
            width: 100%; /* Take full width to allow text-overflow */
        }
        .badge-image, .badge-list-image {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto; /* Center images */
            flex-shrink: 0; /* Prevent image from shrinking */
        }
        .badge_empty_circle, .badge_list_empty_circle {
            width: 80px; /* Smaller size for list */
            height: 80px; /* Smaller size for list */
            background: rgba(0, 0, 0, 0.2);
            border-radius: 50%;
            margin: 0 auto; /* Center empty circle */
             flex-shrink: 0; /* Prevent circle from shrinking */
        }

        .badge-link, .badge-list-link {
            text-decoration: none;
            color: inherit;
            display: flex; /* Make the link a flex container */
            justify-content: center; /* Center children horizontally */
            align-items: center; /* Center children vertically */
            width: 100%; /* Make the link take the full width of its parent */
            min-height: 80px; /* Minimum height for list items */
            box-sizing: border-box; /* Include padding and border in the element's total width and height */
            margin-bottom: 5px; /* Space between image/circle and scarcity */
        }

        .badge-level, .badge-list-scarcity {
            margin-top: 10px;
            color: #B8B6B4;
            font-size: 12px; /* Smaller font for list scarcity */
        }
        .badge-link:hover, .badge-list-link:hover {
            opacity: 0.8;
        }
        .foil .badge-title, .foil .badge-list-title {
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
        .badge-list-scarcity {
            margin-top: auto; /* Push scarcity to the bottom */
            font-size: 11px; /* Even smaller font */
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
             link.href = '#';
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

        const title = document.createElement('div');
        title.className = 'badge-list-title';
        title.textContent = badgeData.name || 'Unknown Badge';
        badgeListBox.appendChild(title);

        const link = document.createElement('a');
        link.className = 'badge-list-link';
        link.href = '#'; // Keep non-clickable as API doesn't provide a direct badge page link
        link.style.cursor = 'default';

        // --- CONSTRUCT IMAGE URL FROM API DATA ---
        let badgeImageUrl = null;
        // Check if appId and badgeImage are available and are strings/numbers
        if (badgeData.appId && badgeData.badgeImage &&
            (typeof badgeData.appId === 'number' || typeof badgeData.appId === 'string') &&
            typeof badgeData.badgeImage === 'string' && badgeData.badgeImage.length > 0) {

            badgeImageUrl = `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/items/${badgeData.appId}/${badgeData.badgeImage}`;
            logDebug(`Constructed image URL for list item: ${badgeImageUrl}`);

            const image = document.createElement('img');
            image.className = 'badge-list-image';
            image.src = badgeImageUrl;
            image.alt = badgeData.name || 'Badge Image'; // Add alt text
            // Optional: Add an error listener to see if the image fails to load
            image.onerror = () => {
                logError(`Failed to load constructed image for badge list item: ${badgeData.name} from URL: ${badgeImageUrl}`);
                // Replace with empty circle if image fails
                link.innerHTML = ''; // Clear any failed image
                const emptyCircle = document.createElement('div');
                emptyCircle.className = 'badge_list_empty_circle';
                link.appendChild(emptyCircle);
            };
            link.appendChild(image);

        } else {
             logDebug(`Insufficient data (appId or badgeImage) from API to construct image URL for badge: ${badgeData.name}. Using empty circle.`);
            const emptyCircle = document.createElement('div');
            emptyCircle.className = 'badge_list_empty_circle';
            link.appendChild(emptyCircle);
        }
        // --- END CONSTRUCT IMAGE URL ---


        badgeListBox.appendChild(link);

        // Use badgeData.scarcity directly from the API response
        if (badgeData.scarcity !== undefined && badgeData.scarcity !== null) {
            const scarcity = document.createElement('div');
            scarcity.className = 'badge-list-scarcity';
            scarcity.textContent = `Scarcity: ${badgeData.scarcity}`;
            badgeListBox.appendChild(scarcity);
        } else {
            // Add a placeholder if scarcity is missing
            const scarcity = document.createElement('div');
            scarcity.className = 'badge-list-scarcity';
            scarcity.textContent = `Scarcity: N/A`;
             scarcity.style.fontStyle = 'italic';
             scarcity.style.color = '#666';
            badgeListBox.appendChild(scarcity);
        }


        return badgeListBox;
    }


    async function fetchAndDisplayBadgeList(appId) {
         if (!SteamSetsAPI || SteamSetsAPI === "ss_YOUR_API_KEY") {
            logWarn("SteamSets API key not configured or is placeholder. Skipping badge list fetch.");
            return;
        }

        log(`Fetching badge list for App ID: ${appId} from SteamSets API.`);

        const badgeListContainer = document.createElement('div');
        badgeListContainer.className = 'badge-list-container';
        // Temporarily add a loading message
        badgeListContainer.textContent = 'Loading available badges...';

        const target = document.querySelector('.booster_creator_left');
         if (!target) {
            logWarn('Target element .booster_creator_left not found for badge list.');
            return;
        }

        // Add the list container *before* the main badge container
        target.insertAdjacentElement('afterend', badgeListContainer);


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

                        // --- DEBUGGING: Log the full API response data ---
                        logAPIData('Full SteamSets API Response Data:', data);
                        // --- END DEBUGGING ---


                        if (data && data.badges && Array.isArray(data.badges)) {
                            log(`Fetched ${data.badges.length} badges from SteamSets API.`);

                            // Sort badges
                            const sortedBadges = data.badges.sort((a, b) => {
                                // isFoil false first
                                if (a.isFoil !== b.isFoil) {
                                    return a.isFoil ? 1 : -1; // false comes before true
                                }
                                // Then by highestLevel low to high for non-foil
                                if (!a.isFoil && !b.isFoil) {
                                    return (a.highestLevel || 0) - (b.highestLevel || 0);
                                }
                                // For foil (which will be grouped at the end), sort by highestLevel low to high
                                if (a.isFoil && b.isFoil) {
                                     return (a.highestLevel || 0) - (b.highestLevel || 0);
                                }
                                return 0; // Should not reach here
                            });

                            // Take the first 6 sorted badges
                            const top6Badges = sortedBadges.slice(0, 6);

                            if (top6Badges.length > 0) {
                                log(`Displaying top ${top6Badges.length} badges:`);
                                logTable(top6Badges); // Log the actual badge data received
                                top6Badges.forEach(badge => {
                                    badgeListContainer.appendChild(createBadgeListItem(badge));
                                });
                            } else {
                                badgeListContainer.textContent = 'No badges found for this app via SteamSets API.';
                            }

                        } else {
                            logError('SteamSets API response did not contain expected badge data structure:', data);
                            badgeListContainer.textContent = 'Error fetching badge list: Invalid data format.';
                        }
                    } catch (e) {
                        logError('Error parsing SteamSets API response:', e);
                        badgeListContainer.textContent = 'Error fetching badge list: Invalid JSON response.';
                    }
                } else {
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
                    badgeListContainer.textContent = errorMessage;
                }
            },
            onerror: (error) => {
                logError(`SteamSets API request failed:`, error);
                badgeListContainer.innerHTML = ''; // Clear loading message
                badgeListContainer.textContent = `Network error fetching badge list.`;
            }
        });
    }


    // Main function to fetch and display badge info
    async function updateBadgeInfo() {
        const appId = getAppId();
        if (!appId) {
            logWarn('Could not get App ID from URL.');
            return;
        }

        // Use the hardcoded values directly from the top-level config
        const userId = USER_STEAM_ID;
        const isSteamId64 = STEAM_ID_IS_STEAMID64;

        // Basic check to ensure the user has updated the placeholder
        if (userId === "REPLACE_WITH_YOUR_STEAM_ID") {
            logError("Please update the USER_STEAM_ID variable in the script with your Steam ID.");
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: red; font-weight: bold; margin-top: 20px; text-align: center;';
            errorDiv.textContent = "Steam Badge Info Injector: Please edit the script and replace 'REPLACE_WITH_YOUR_STEAM_ID' with your actual Steam ID.";
            const target = document.querySelector('.booster_creator_left');
            if (target) {
                 target.insertAdjacentElement('afterend', errorDiv);
            } else {
                 document.body.prepend(errorDiv);
            }
            return;
        }

        // Remove existing containers before adding new ones
        const existingMainContainer = document.querySelector('.badge-container');
        if (existingMainContainer) {
            existingMainContainer.remove();
        }
        const existingListContainer = document.querySelector('.badge-list-container');
         if (existingListContainer) {
            existingListContainer.remove();
        }
         const existingError = document.querySelector('div[style*="color: red"]');
        if(existingError) {
            existingError.remove();
        }


        log(`Fetching badge data for App ID: ${appId} and User ID: ${userId} (Type: ${isSteamId64 ? 'SteamID64' : 'Custom ID'})`);

        // Fetch and display the list of available badges first
        fetchAndDisplayBadgeList(appId);


        const container = document.createElement('div');
        container.className = 'badge-container';
        // Add a temporary loading state for the main badge container
        container.textContent = 'Loading your badge info...';


        const target = document.querySelector('.booster_creator_left');
         if (!target) {
            logWarn('Target element .booster_creator_left not found. Main badge container not inserted.');
             return;
        }
        // Insert the main container after the list container (which is already inserted after target)
        // Or, if list container wasn't inserted, insert directly after target.
        const listContainerCheck = document.querySelector('.badge-list-container');
         if (listContainerCheck) {
            listContainerCheck.insertAdjacentElement('afterend', container);
         } else {
            target.insertAdjacentElement('afterend', container);
         }


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

    addStyle(style);

    // --- Initial Run and Observers ---

    // Use a small delay to allow the page structure to load
    setTimeout(updateBadgeInfo, 500);

    // Use MutationObserver to detect URL changes within the page
    // Observe the body for subtree and child list changes to catch SPA navigation
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            log(`URL changed to: ${currentUrl}. Updating badge info.`);
            // Add a small delay before updating to ensure the page structure is ready
            setTimeout(updateBadgeInfo, 200);
        }
    });

    // Start observing the document body
    observer.observe(document.body, { subtree: true, childList: true });

    // Also try to run updateBadgeInfo on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        log('DOMContentLoaded event fired.');
        setTimeout(updateBadgeInfo, 300);
    });

})();
