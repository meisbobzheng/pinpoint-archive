// StoreLocator.tsx
import type { BrandSettings } from "app/types/brands";
import JavaScriptObfuscator from "javascript-obfuscator";
import { renderToString } from "react-dom/server";

const styles = (
  backgroundColor: string,
  textColor: string,
  layout: "row" | "row-reverse",
) => `
  .page-width--narrow {
      max-width: 150rem;
      padding: 10px;
  }

  .pp-container {
    font-family: "Poppins";
    position: relative;
    margin: 0 auto;
    display: flex;
    flex-direction: ${layout};
    height: 800px;
    width: auto;
    max-width: 1500px;
    padding: 30px;
    background-color: ${backgroundColor};
    border-radius: 15px;
    border: 1px solid #ccc;
    gap: 30px;
  }

  @media screen and (max-width: 990px) {
    .page-width--narrow {
        max-width: 100.6rem;
        padding: 10px;
    }

    .container {
        display: flex;
        flex-direction: column-reverse;
    }
  }

  .pp-menu {
    position: relative;
    width: 30%;
    min-width: 300px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .store-locator-box {
    width: 100%;
    height: 60px;
    background-color: white;
    border-radius: 15px;
    box-shadow: 0px 10px 50px rgba(0, 0, 0, 0.05);
    border: 1px solid #eee;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding-left: 15px;
  }

  .store-locator-box h1 {
    font-weight: 200;
    color: #444;
  }

  .pp-search-box {
    margin-bottom: 20px;
    padding-block: 15px;
    flex-grow: 1;
    background-color: white;
    border-radius: 15px;
    box-shadow: 0px 10px 50px rgba(0, 0, 0, 0.05);
    border: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 0px;
    height: 100%;
    overflow: hidden;
  }

  .pp-search-bar {
    border: 1px solid #ddd;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    margin: 0px 15px;
    padding: 8px 10px;
    font-size: 16px;
    font-family: "Poppins";
    outline: none;
  }

  .pp-search-bar input {
    background-color: transparent;
    border: none;
    font-size: 16px;
    font-family: "Poppins";
    outline: none;
  }

  .pp-search-box ul {
    list-style: none;
    padding: 0px 0px;
  }

  .pp-search-box ul li {
    font-size: 16px;
    font-weight: 400;
    color: ${textColor};
    cursor: pointer;
    padding: 15px 38px;
  }

  .pp-search-box ul li:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  .pp-search-box ul li:active {
    background-color: #eee;
  }

  .pp-map-container {
    position: relative;
    flex-grow: 1;
    height: 100%;
    z-index: 0;
    border-radius: 15px;
    box-shadow: 0px 10px 50px rgba(0, 0, 0, 0.05);
  }

  #map {
    height: 100%;
    width: 100%;
    border-radius: 15px;
  }

  #recenterButton {
    position: absolute;
    bottom: 23px;
    right: 75px;
    padding: 10px 20px;
    background-color: white;
    border: 1px solid #ccc;
    cursor: pointer;
    z-index: 100;
  }

  .pp-search-results {
    margin-top: 15px;
    margin-right: 15px;
    overflow-y: auto;
    height: auto;
    max-height: 800px;
  }

  @media screen and (max-width: 990px) {

    .menu {
      width: 100%;
    }

    .search-results {
      max-height: 200px;
    }
  }
`;

const mapScript = ({
  appUrl,
  brandHash,
  clusterColor,
  markerColor,
  theme,
}: {
  appUrl: string;
  brandHash: string;
  clusterColor: string;
  markerColor: string;
  theme: string;
}) => {
  const script = `
      let map;

      let markers = [];
      let storeResults = [];
      let storeListItems = [];
      let infoWindows = [];
      let inputValue = "";

      const debounce = (func, delay) => {
        let timeout;
        return function () {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, arguments), delay);
        };
      };

      const latlonFromGeohash = (geohash) => decode(geohash);

        function fadeMarker(marker, start, end, onComplete) {
          const duration = 250; // Animation duration in ms
          const startTime = performance.now();
          
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const opacity = start + (end - start) * progress;
            marker.content.style.opacity = opacity;
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else if (onComplete) {
              onComplete();
            }
          };
          
          requestAnimationFrame(animate);
        }

      const StoreService = {
        async updateData() {
          const dataRaw = await fetch("${appUrl}/api/fetch-stores?brandHash=${brandHash}&center=" + map.getCenter().lat() + "," + map.getCenter().lng() + "&zoom=" + map.getZoom() + "&search=" + inputValue)
            .then((response) => response.json())
            .then((data) => {
              return data;
            });

          inputValue = "";

          const data = dataRaw.markersData;
          storeResults = dataRaw.stores;

          // dedupe markers
          const newData = data.filter((d) => markers.findIndex((m) => m.geohash === d.geohash && d.type === m.type && d.count === m.count) === -1);
          newData.forEach((d) => {
            const marker = MarkerManager.createMarker(d.type, d.geohash, d.count);
            d.marker = marker;
          });
          markers = [...markers, ...newData];

          markers.forEach((m) => {
            if (data.findIndex((d) => d.geohash === m.geohash && d.type === m.type && d.count === m.count) === -1) {
              // Fade out
              fadeMarker(m.marker, 1, 0, () => {
                m.marker.setMap(null);
              });
            } else {
              // Set map first for fade in
              const shouldFade = m.marker.map === null;
              m.marker.setMap(map);
              if (shouldFade) fadeMarker(m.marker, 0, 1);
            }
          });

          MapHandler.loadSearchResults();
          return data;
        }
      };

      // Map Initialization and Setup
      const MapHandler = {
        async initMap() {
          map = new google.maps.Map(document.getElementById("map"), {
            mapId: "${theme}",
            center: { lat: 39.83, lng: -95.76 },
            zoom: 4,
            minZoom: 4,
            maxZoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            gestureHandling: 'greedy',
          });

          MapHandler.setupEventListeners();
          MapHandler.addUserLocationMarker();
          setTimeout(() => MapHandler.loadSearchResults(), 1000);
        },

        displayPredictions(predictions, input) {
          const dropdown = document.getElementById('predictionsDropdown');
          dropdown.style.display = 'block';
          dropdown.innerHTML = ''; // Clear previous results

          predictions.forEach(prediction => {
            const option = document.createElement('div');
            option.textContent = prediction.description;
            option.onclick = () => selectPrediction(prediction);
            option.style.padding = '10px';
            option.style.cursor = 'pointer';
            option.style.borderBottom = '1px solid #eee';
            option.style.fontSize = '16px';
            option.addEventListener('mouseover', () => {
              option.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
            });
            option.addEventListener('mouseout', () => {
              option.style.backgroundColor = 'transparent';
            });
            dropdown.appendChild(option);

            option.addEventListener('click', () => {
              inputValue = prediction.description;

              new google.maps.places.PlacesService(map).getDetails({
                placeId: prediction.placeId
              }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                  map.panTo(place.geometry.location);
                  MapHandler.gradualZoomIn(13, 500);
                }
              });
            });
          });
        },

        setupEventListeners() {        
          map.addListener('bounds_changed', debounce(async () => {
            try {
              await StoreService.updateData();
              await MapHandler.loadSearchResults();
            } catch (e) {
              console.error(e);
            }
          }, 700));

          document.addEventListener("click", () => {
            document.getElementById("predictionsDropdown").style.display = "none";
          });

          document.getElementById("locationSearch").addEventListener("input", () => {
            const input = document.getElementById("locationSearch");
            const autocomplete = new google.maps.places.AutocompleteService();
            
            // No need for explicit empty check
            autocomplete.getPlacePredictions(
              {
                input: input.value,
                types: ['geocode'],
                locationBias: {
                  center: map.getCenter(),
                  radius: 50000
                }
              }, 
              (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                  const top5Results = predictions.slice(0, 5).map(prediction => ({
                    description: prediction.description,
                    placeId: prediction.place_id
                  }));
                  
                  MapHandler.displayPredictions(top5Results, input.value);
                } else {
                  // Clear predictions if no results or error
                  MapHandler.displayPredictions([], input.value);
                }
              }
            );
          });
        },

        addUserLocationMarker() {
          const userLocationMarker = new google.maps.Marker({
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 100,
          });

          const radiusCircle = new google.maps.Circle({
            strokeColor: "#4285F4",
            strokeOpacity: 0.5,
            strokeWeight: 0,
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            map: map,
          });

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };

                userLocationMarker.setPosition(userLocation);
                map.setCenter(userLocation);
                map.setZoom(15);

                radiusCircle.setCenter(userLocation);

                let radius = 0;
                const maxRadius = 300;
                const pulseInterval = setInterval(() => {
                  radius = (radius + 10) % maxRadius;
                  radiusCircle.setRadius(radius);
                  radiusCircle.setOptions({
                    fillOpacity: 0.3 * (1 - radius / maxRadius),
                  });
                }, 50);
              },
              (error) => {
                console.error('Geolocation error:', error);
              },
              { 
                enableHighAccuracy: true, 
                timeout: 5000, 
                maximumAge: 0 
              }
            );
          }

          document
            .getElementById("recenterButton")
            .addEventListener("click", () => {
              if (userLocationMarker.getPosition()) {
                map.panTo(userLocationMarker.getPosition());
              }
            });
        },

        gradualZoomIn(targetZoom, duration) {
          const initialZoom = map.getZoom();
          const zoomSteps = targetZoom - initialZoom;
          const stepTime = duration / Math.abs(zoomSteps); // Time per zoom step

          let currentZoom = initialZoom;

          const zoomInterval = setInterval(() => {
            if (currentZoom === targetZoom) {
              clearInterval(zoomInterval); // Stop the interval once the target zoom is reached
            } else {
              currentZoom += targetZoom > initialZoom ? 1 : -1; // Increment or decrement zoom
              map.setZoom(currentZoom);
            }
          }, stepTime);
        },   
        
        async loadSearchResults() {
          // Update the search results UI
          const resultList = document.getElementById("result-list");
          resultList.innerHTML = ""; // Clear existing results
          if (storeResults.length === 0) {
            resultList.innerHTML = "<li>No stores in view</li>";
            return;
          }
          storeResults.forEach((store) => {
            const position = decode(store.geohash);

            const listItem = document.createElement("li");
            listItem.style.display = "flex";
            listItem.style.alignItems = "center";
            listItem.style.padding = "10px 40px";

            const icon = document.createElement("span");
            icon.className = "material-symbols-outlined";
            icon.style.fontSize = "20px";
            icon.style.paddingRight = "18px";
            icon.style.transform = "translateY(4px)";
            icon.textContent = "location_on";

            const info = document.createElement("div");
            info.style.display = "flex";
            info.style.flexDirection = "column";

            const storeName = document.createElement("div");
            storeName.style.fontWeight = "bold";
            storeName.textContent = store.name;

            const addressPrimary = document.createElement("div");
            addressPrimary.textContent = store.addressPrimary;

            const addressSecondary = store.addressSecondary
              ? document.createElement("div")
              : null;
            if (addressSecondary) {
              addressSecondary.textContent = store.addressSecondary;
            }

            const location = document.createElement("div");
            location.textContent = store.city + ", " + store.state;

            // Append details to the info container
            info.appendChild(storeName);
            info.appendChild(addressPrimary);
            if (addressSecondary) info.appendChild(addressSecondary);
            info.appendChild(location);

            // Add icon and info to the list item
            listItem.appendChild(icon);
            listItem.appendChild(info);

            const getMarker = (pos) =>
              markers.find((marker) => {
                return marker.type === "marker" && marker.geohash.substring(0, 6) === store.geohash.substring(0, 6);
              });

            // Add interactivity
            listItem.addEventListener("click", async () => {
              const currentPosition = map.getCenter();

              if (Number(currentPosition.lat().toFixed(7)) === Number(position.latitude.toFixed(7)) && Number(currentPosition.lng().toFixed(7)) === Number(position.longitude.toFixed(7))) {
                return;
              }

              map.panTo(new google.maps.LatLng(position.latitude, position.longitude));

              if (map.getZoom() < 13) {
                MapHandler.gradualZoomIn(13, 500);
              }

              inputValue = store.city + ", " + store.state;

              // Trigger the marker's click handler manually after zooming in
              setTimeout(async () => {
                const marker = getMarker(position);
                if (marker && marker.marker) {
                  // Trigger the click event handler directly
                  google.maps.event.trigger(marker.marker, "click");
                }
              }, 600);
            });

            listItem.addEventListener("mouseover", () => {
              if (map.getZoom() < 12) return;
              const marker = getMarker(store.geohash);
              marker.marker.content.style.transform = "scale(1.5)";
            });

            listItem.addEventListener("mouseout", () => {
              if (map.getZoom() < 12) return;
              const marker = getMarker(store.geohash);
              marker.marker.content.style.transform = "scale(1)";
            });

            // Append the list item to the results list
            storeListItems.push(listItem);
            resultList.appendChild(listItem);
          });        
        },
      };

      const MarkerManager = {
        createMarker(type, geohash, count) {
          const position = decode(geohash);
          
          // Circular icon with count
          const element = document.createElement("div");
          element.textContent = type === "cluster" || type === "optimal-cluster" ? count : "";
          element.style.fontSize = "14px";
          element.style.fontWeight = "bold";
          element.style.color = "#fff";
          element.style.textAlign = "center";
          element.style.lineHeight = "1";
          element.style.width = 25 + count/20 + "px";
          element.style.height = 25 + count/20 + "px";
          element.style.borderRadius = "50%";
          element.style.backgroundColor = "${clusterColor}";
          element.style.display = "flex";
          element.style.alignItems = "center";
          element.style.justifyContent = "center";
          element.style.boxShadow = "0 0 4px 4px rgba(0, 0, 0, 0.1)";
          element.style.cursor = "pointer";
          element.style.zIndex = "100";
          element.style.transform = "translate(0, 50%)";

          // Marker icon
          const pin = document.createElement("div");
          pin.style.width = "45px";
          pin.style.height = "45px";
          pin.style.transformOrigin = "bottom";
          pin.innerHTML = '<svg width="45" height="45" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.54 22.351L11.638 22.407C11.749 22.467 11.8733 22.4985 11.9995 22.4985C12.1257 22.4985 12.25 22.467 12.361 22.407L12.389 22.392L12.46 22.351C12.8511 22.1191 13.2328 21.8716 13.604 21.609C14.5651 20.9305 15.463 20.1667 16.287 19.327C18.231 17.337 20.25 14.347 20.25 10.5C20.25 8.31196 19.3808 6.21354 17.8336 4.66637C16.2865 3.11919 14.188 2.25 12 2.25C9.81196 2.25 7.71354 3.11919 6.16637 4.66637C4.61919 6.21354 3.75 8.31196 3.75 10.5C3.75 14.346 5.77 17.337 7.713 19.327C8.53664 20.1667 9.43427 20.9304 10.395 21.609C10.7666 21.8716 11.1485 22.1191 11.54 22.351ZM12 13.5C12.7956 13.5 13.5587 13.1839 14.1213 12.6213C14.6839 12.0587 15 11.2956 15 10.5C15 9.70435 14.6839 8.94129 14.1213 8.37868C13.5587 7.81607 12.7956 7.5 12 7.5C11.2044 7.5 10.4413 7.81607 9.87868 8.37868C9.31607 8.94129 9 9.70435 9 10.5C9 11.2956 9.31607 12.0587 9.87868 12.6213C10.4413 13.1839 11.2044 13.5 12 13.5Z" fill="${markerColor}"/></svg>';

          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: position.latitude, lng: position.longitude },
            map: null,
            content: type === "marker" ? pin : element,
          });

          marker.addListener("click", () => {
            if (type !== "marker") {
              const currentZoom = map.getZoom();
              const zoomTo = count > 1 ? Math.min(13, currentZoom + 2) : 13;
              MapHandler.gradualZoomIn(zoomTo, 500);
            }
            map.panTo(marker.position);
          });

          if (type === "marker") {
            marker.addListener("click", () => {
              for (const infoWindow of infoWindows) {
                infoWindow.close();
              }
              const storeInfo = storeResults.find((store) => store.geohash.substring(0, 6) === geohash.substring(0, 6));
              // Create an info window with the store name, address, phone, email, website, and tags
              const infoWindowContent = document.createElement("div");
              
              // Add basic styles directly in JavaScript
              infoWindowContent.style.fontFamily = "Arial, sans-serif";
              infoWindowContent.style.fontSize = "14px";
              infoWindowContent.style.color = "#333";
              infoWindowContent.style.maxWidth = "250px";
              infoWindowContent.style.padding = "10px";
              infoWindowContent.style.backgroundColor = "#fff";
              infoWindowContent.style.lineHeight = "1.5";
              infoWindowContent.style.position = "relative"; // Make sure content is positioned correctly

              // Concatenate HTML for the info window content
              var contentHtml = 
                "<div style='margin-bottom: 10px; font-weight: bold; font-size: 16px; color: #2c3e50; width: 90%;'>" + 
                  storeInfo.name + 
                "</div>" +
                "<div style='margin-bottom: 8px; font-size: 14px; color: #7f8c8d;'>" + 
                  "<strong>Address:</strong> " + storeInfo.addressPrimary + "<br>" + 
                  storeInfo.city + ", " + storeInfo.state +
                "</div>" +
                (storeInfo.phone 
                  ? "<div style='margin-bottom: 8px; font-size: 14px; color: #7f8c8d;'><strong>Phone:</strong> " + storeInfo.phone + "</div>" 
                  : "") +
                (storeInfo.email 
                  ? "<div style='margin-bottom: 8px; font-size: 14px; color: #7f8c8d;'><strong>Email:</strong> <a href='mailto:" + storeInfo.email + "' style='color: #2980b9; text-decoration: none;'>" + storeInfo.email + "</a></div>" 
                  : "") +
                (storeInfo.website 
                  ? "<div style='margin-bottom: 8px; font-size: 14px;'><a href='" + storeInfo.website + "' target='_blank' style='color: #2980b9; text-decoration: none; font-weight: bold;'>Visit Website</a></div>" 
                  : "") + 
                (storeInfo.tags.length > 0 
                  ? storeInfo.tags.map((tag) => {
                      return "<div style='margin-bottom: 8px; font-size: 14px; color: #7f8c8d;'>" + tag + "</div>";
                    }).join('') 
                  : "");

              infoWindowContent.innerHTML = contentHtml;

              const closeButton = document.createElement("button");
              closeButton.innerHTML = "X";
              closeButton.style.position = "absolute";
              closeButton.style.top = "5px";
              closeButton.style.right = "5px";
              closeButton.style.background = "none";
              closeButton.style.border = "none";
              closeButton.style.color = "#333";
              closeButton.style.fontSize = "16px";
              closeButton.style.fontWeight = "bold";
              closeButton.style.cursor = "pointer";
              closeButton.style.padding = "5px";
              closeButton.style.borderRadius = "50%";
              closeButton.style.transition = "background-color 0.2s";
              
              closeButton.onmouseover = function() {
                closeButton.style.backgroundColor = "#f2f2f2";
              };
              
              closeButton.onmouseout = function() {
                closeButton.style.backgroundColor = "transparent";
              };

              infoWindowContent.appendChild(closeButton);

              const infoWindow = new google.maps.InfoWindow({
                headerDisabled: true,
                content: infoWindowContent,
                disableAutoPan: true,
              });

              infoWindow.open({ anchor: marker, map, shouldFocus: true });
              infoWindows.push(infoWindow);

              closeButton.addEventListener("click", () => {
                infoWindows.forEach((infoWindow) => {
                  infoWindow.close();
                });
              });
            });   
          }       

          return marker;
        },
      };

      window.initMap = MapHandler.initMap;
      `;

  const obfuscatedScript = JavaScriptObfuscator.obfuscate(script, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: "mangled",
    log: false,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: true,
    stringArray: true,
    stringArrayEncoding: ["rc4"],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
  });

  return obfuscatedScript.getObfuscatedCode();
};

function StoreLocator({
  showAttribution = true,
  placeholder,
}: {
  showAttribution: boolean;
  placeholder: string;
}) {
  // TODO: Add correct PinPoint link
  return (
    <div className="pp-container">
      <div className="pp-menu">
        <div className="pp-search-box">
          <div className="pp-search-bar" style={{ position: "relative" }}>
            <input
              id="locationSearch"
              placeholder={placeholder}
              style={{ width: "85%", paddingLeft: "50px" }}
            />
            <span
              className="material-icons"
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              search
            </span>
          </div>
          <div
            id="predictionsDropdown"
            style={{
              display: "none",
              position: "absolute",
              top: "70px",
              left: "20px",
              width: "85%",
              maxHeight: "300px",
              overflowY: "auto",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              zIndex: 1,
            }}
          ></div>
          <div className="pp-search-results">
            <ul id="result-list">
              <li>No stores in view</li>
            </ul>
          </div>
        </div>
        {showAttribution && (
          <div>
            <p style={{ fontSize: "12px", color: "#777", textAlign: "center" }}>
              Powered by{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.google.com/maps"
                style={{ textDecoration: "underline", color: "inherit" }}
              >
                PinPoint
              </a>
            </p>
          </div>
        )}
      </div>
      <div className="pp-map-container">
        <div id="map"></div>
        <button id="recenterButton">Recenter</button>
      </div>
    </div>
  );
}

export const generateStoreLocatorHTML = ({
  backgroundColor,
  textColor,
  clusterColor,
  markerColor,
  theme,
  layout,
  showAttribution,
  searchPlaceholder,
  language,
  customCSS,
  apiKey,
  appUrl,
  brandHash,
}: BrandSettings & {
  appUrl: string;
  brandHash: string;
}) => {
  const componentString = renderToString(
    <StoreLocator
      showAttribution={showAttribution}
      placeholder={searchPlaceholder}
    />,
  );

  const convertLayout = layout === "sidebarright" ? "row-reverse" : "row";

  return `
    <!doctype html>
    <html class="js" style="--header-height: 85px;" lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Shopify-based store locator for brands.">
        <title>Store Locator</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=location_on" />
        <style>${styles(backgroundColor, textColor, convertLayout)} ${customCSS}</style>
      </head>
      <body>
        <div>
        ${componentString}
        </div>
        <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=geometry,marker,places&loading=async" async defer></script>
        <script src="https://cdn.jsdelivr.net/npm/ngeohash@0.6.3/main.min.js" defer></script>
        <script>${mapScript({ appUrl, brandHash, clusterColor, markerColor, theme })}</script>
      </body>
    </html>
  `;
};

// Call this function to generate the HTML in the same directory
// Useful for testing the component in a Live Server
// const generateDev = () =>
//   fs.writeFileSync(
//     "app/components/locator/devLocator.html",
//     generateStoreLocatorHTML({
//       apiKey: "AIzaSyCF28zfdkdyBoO4P7lX5_CU1bxBIALZ2uk",
//     }),
//   );

// generateDev();
