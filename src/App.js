import React, { useState,useEffect,useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer,Marker, Popup,useMapEvent, useMap   } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.scss'
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

  
const App = () => {      

  const mapRef = useRef();

  const [ClickPosition, setClickPosition] = useState({})
  const [disTance2Point, setDisTance2Point] = useState(0)
  const [dataLoggerClick, setdataLoggerClick] = useState([])
  const [Routing, setRouting] = useState(null)

  const wakeup = new L.Icon({ // marker bình thường
    iconUrl: require("./asset/images/position.png" ),
    iconSize: [40,52],  
    iconAnchor: [17, 49],     // nhỏ thì sang phải, xuống  
    popupAnchor: [3, -45],   // nhỏ thì sang trái  
  })
  const calculateDistance = (point1, point2) => {
    const latLng1 = L.latLng(point1.lat, point1.lng);
    const latLng2 = L.latLng(point2.lat, point2.lng);
    const distance = latLng1.distanceTo(latLng2);
    return distance;
  };

  const findNearestNeighbor = (graph, visited, currPos, n) => {
    let minDistance = Infinity;
    let nearestNeighbor = -1;

    for (let i = 0; i < n; i++) {
      if (!visited[i] && graph[currPos][i] && graph[currPos][i] < minDistance) {
        minDistance = graph[currPos][i];
        nearestNeighbor = i;
      }
    }
    return nearestNeighbor;
  };

  const sortCitiesByNearestNeighbor = (locations, startIdx) => {
    const n = locations.length;
    const graph = Array.from({ length: n }, () => Array(n).fill(0));

    locations.forEach((loc, idx) => {
      locations.forEach((otherLoc, otherIdx) => {
        if (idx !== otherIdx) {
          graph[idx][otherIdx] = calculateDistance(loc, otherLoc);
        }
      });
    });

    const visited = Array(n).fill(false);
    const sortedCities = [];

    let currPos = startIdx;
    sortedCities.push(locations[currPos]);
    visited[currPos] = true;

    for (let count = 1; count < n; count++) {
      const nearestNeighbor = findNearestNeighbor(graph, visited, currPos, n);
      if (nearestNeighbor !== -1) {
        sortedCities.push(locations[nearestNeighbor]);
        visited[nearestNeighbor] = true;
        currPos = nearestNeighbor;
      }
    }
    return sortedCities;
  };

  // Hàm hoán vị (permutation)
  const permute = (arr) => {
    const result = [];
    const perm = (path, options) => {
      if (options.length === 0) {
        result.push(path);
      } else {
        for (let i = 0; i < options.length; i++) {
          perm([...path, options[i]], options.filter((_, index) => index !== i));
        }
      }
    };
    perm([], arr);
    return result;
  };
  
  // Hàm Brute Force để tìm đường đi ngắn nhất
  const findShortestPath = (points) => {
    const permutations = permute(points);
    let shortestDistance = Infinity;
    let shortestPath = [];
  
    permutations.forEach(permutation => {
      let totalDistance = 0;
      for (let i = 0; i < permutation.length - 1; i++) {
        totalDistance += calculateDistance(permutation[i], permutation[i + 1]);
      }
  
      if (totalDistance < shortestDistance) {
        shortestDistance = totalDistance;
        shortestPath = permutation;
      }
    });
    return shortestPath;
  };

  const [address, setAddress] = useState("");

  
  const getAddressFromCoordinates = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = response.data;
      setAddress(data.display_name || "Không tìm thấy địa chỉ");
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      setAddress("Không thể lấy địa chỉ");
    }
  };


  const handleMapClickGetLocation = (e) => {

    getAddressFromCoordinates(e.latlng.lat,  e.latlng.lng);
    setClickPosition({lat:e.latlng.lat , lng : e.latlng.lng })
    setdataLoggerClick(pre => [...pre, {lat:e.latlng.lat , lng : e.latlng.lng}])
    
    // lấy tọa độ khi Click vô Map
    console.log('lat: '+ e.latlng.lat)
    console.log('lng: '+ e.latlng.lng)
  };

  useEffect(()=>{
    if(dataLoggerClick.length === 2){
          calculateDistance(dataLoggerClick[0],dataLoggerClick[1])
    }

  },[dataLoggerClick])

  const currentRoutingRef = useRef(null);
  ///////////////////////////////////////////
  const handleDisplayRouteBruteForce = async () => {
    RemoveRoute();
    try {
        
        const OptimizePath = findShortestPath(dataLoggerClick);
        const listLocationFull = OptimizePath.map((bin) => L.latLng(bin.lat, bin.lng));
        const routing = L.Routing.control({
            waypoints: [
               ...listLocationFull
            ],
            lineOptions: {
              styles: [
                {
                  color: "blue",
                  opacity: 0.6,
                  weight: 8
                }
              ]
            },  
            routeWhileDragging: true,
            addWaypoints: false, 
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            createMarker: function() { return null; }
          
        });
        currentRoutingRef.current = routing; 
        routing.addTo(mapRef.current);
        
    } catch (error) {
      console.error('Error displaying route:', error);
    }
  };

  const handleDisplayRouteNN = async () => {
    RemoveRoute();
    try {
        
        const OptimizePath = sortCitiesByNearestNeighbor(dataLoggerClick,0);
        const listLocationFull = OptimizePath.map((bin) => L.latLng(bin.lat, bin.lng));
        const routing = L.Routing.control({
            waypoints: [
               ...listLocationFull
            ],
            lineOptions: {
              styles: [
                {
                  color: "blue",
                  opacity: 0.6,
                  weight: 8
                }
              ]
            },  
            routeWhileDragging: true,
            addWaypoints: false, 
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            createMarker: function() { return null; }
          
        });
        currentRoutingRef.current = routing; 
        routing.addTo(mapRef.current);
        
    } catch (error) {
      console.error('Error displaying route:', error);
    }
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const GA_TSP = (locations, populationSize, generations, mutationRate) => {
    // 1. Khởi tạo quần thể ban đầu
    const createRandomPath = () => {
      let path = [...locations];
      for (let i = path.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [path[i], path[randomIndex]] = [path[randomIndex], path[i]];
      }
      return path;
    };
  
    const createPopulation = () => {
      let population = [];
      for (let i = 0; i < populationSize; i++) {
        population.push(createRandomPath());
      }
      return population;
    };
  
    // 2. Đánh giá (Fitness function)
    const calculateFitness = (path) => {
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        totalDistance += calculateDistance(path[i], path[i + 1]);
      }
      return totalDistance;
    };
  
    const evaluatePopulation = (population) => {
      return population.map((path) => ({
        path,
        fitness: calculateFitness(path),
      }));
    };
  
    // 3. Chọn lọc (Selection)
    const selection = (evaluatedPopulation) => {
      evaluatedPopulation.sort((a, b) => a.fitness - b.fitness);
      return evaluatedPopulation.slice(0, populationSize / 2); // Chọn một nửa tốt nhất
    };
  
    // 4. Lai ghép (Crossover)
    const crossover = (parent1, parent2) => {
      const start = Math.floor(Math.random() * parent1.length);
      const end = start + Math.floor(Math.random() * (parent1.length - start));
  
      const child = parent1.slice(start, end);
  
      parent2.forEach((city) => {
        if (!child.includes(city)) {
          child.push(city);
        }
      });
  
      return child;
    };
  
    const generateNewPopulation = (selectedPopulation) => {
      const newPopulation = [];
      for (let i = 0; i < populationSize; i++) {
        const parent1 = selectedPopulation[Math.floor(Math.random() * selectedPopulation.length)].path;
        const parent2 = selectedPopulation[Math.floor(Math.random() * selectedPopulation.length)].path;
        newPopulation.push(crossover(parent1, parent2));
      }
      return newPopulation;
    };
  
    // 5. Đột biến (Mutation)
    const mutate = (path) => {
      if (Math.random() < mutationRate) {
        const indexA = Math.floor(Math.random() * path.length);
        const indexB = Math.floor(Math.random() * path.length);
        [path[indexA], path[indexB]] = [path[indexB], path[indexA]]; // Swap hai thành phố
      }
      return path;
    };
  
    const applyMutation = (population) => {
      return population.map((individual) => mutate(individual));
    };
  
    // 6. Lặp lại quá trình cho đến khi đạt được thế hệ mong muốn
    let population = createPopulation();
  
    for (let gen = 0; gen < generations; gen++) {
      const evaluatedPopulation = evaluatePopulation(population);
      const selectedPopulation = selection(evaluatedPopulation);
      population = generateNewPopulation(selectedPopulation);
      population = applyMutation(population);
    }
  
    // Tìm ra lộ trình tốt nhất từ quần thể cuối cùng
    const finalEvaluatedPopulation = evaluatePopulation(population);
    finalEvaluatedPopulation.sort((a, b) => a.fitness - b.fitness);
    return finalEvaluatedPopulation[0].path; // Trả về lộ trình tốt nhất
  };
  
  // Sử dụng hàm GA_TSP trong ứng dụng của bạn
  const handleDisplayRouteGA = async () => {
    RemoveRoute();
    try {
      const bestPath = GA_TSP(dataLoggerClick, 100, 500, 0.01); // Khởi tạo GA với quần thể 100, 500 thế hệ, tỷ lệ đột biến 1%
      const listLocationFull = bestPath.map((bin) => L.latLng(bin.lat, bin.lng));
  
      const routing = L.Routing.control({
        waypoints: [...listLocationFull],
        lineOptions: {
          styles: [
            {
              color: "blue",
              opacity: 0.6,
              weight: 8,
            },
          ],
        },
        routeWhileDragging: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        createMarker: function () {
          return null;
        },
      });
      currentRoutingRef.current = routing;
      routing.addTo(mapRef.current);
    } catch (error) {
      console.error("Error displaying route:", error);
    }
  };
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const RemoveRoute = () => {   // remove đường đi GPS Tracker
    if(currentRoutingRef.current){
      currentRoutingRef.current.remove();
      currentRoutingRef.current = null;
      console.log('ccccccc')
    }
      
    
  };

  const handleDeleteRoute = () => {
        RemoveRoute()
  }

  const webcamRef = React.useRef(null);

  const capturePhoto = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    console.log(imageSrc); // Base64 image
  }, [webcamRef]);


    async function scanBluetoothDevices() {
      try {
          const device = await navigator.bluetooth.requestDevice({
              acceptAllDevices: true, // Chọn tất cả thiết bị xung quanh
              optionalServices: ['battery_service'] // Có thể chọn dịch vụ khác nếu cần
          });
  
          console.log('Thiết bị được tìm thấy:', device.name || 'Không có tên');
          return device;
      } catch (error) {
          console.error('Lỗi khi quét thiết bị Bluetooth:', error);
      }
  }

  const handleScan = async () => {
    const device = await scanBluetoothDevices();
    if (device) {
        alert(`Tìm thấy thiết bị: ${device.name || 'Không có tên'}`);
    }
  };
  
  
  return (
    <div className='App'>
     
        <div>     
            <h2>Bluetooth Scanner</h2>
            <button onClick={handleScan}>Quét thiết bị Bluetooth</button>
        </div>
   
          <button
              onClick={handleDisplayRouteBruteForce}
          >Display BruteForce</button>
          <button
              onClick={handleDisplayRouteNN}
          >Display NN</button>
          <button
              onClick={handleDisplayRouteGA}
          >Display DA</button>

          <button
              onClick={handleDeleteRoute}
          >Delete</button>


          {/* {dataLogger.map((item,index)=>(
            <div key={index}>
                    {item.id}
                    <br/>
                    {item.position}
                    <button
                      onClick={(e)=>handleDelete(item.id)}
                    >Delete</button>
            </div>
          ))} */}

          <MapContainer 
                center={[10.770834441565942,106.6731350560201]} 
                zoom={17}                
                ref={mapRef}    
          >
                <TileLayer
                    attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MyClickHandlerGetLocation onClick={handleMapClickGetLocation}/>
                {
                  dataLoggerClick.map((item,index)=>(
                    <Marker                    
                          position={[item.lat, item.lng]}
                          icon= { wakeup } 
                          key={index}
                    >
                        <Popup>
                          
                        </Popup>
                    </Marker>
                  ))
                }
                
      </MapContainer>

      <div>
        {ClickPosition.lat}
        <br/>
        {ClickPosition.lng}
      </div>
      <div>
        {disTance2Point}
      </div>
      <div>
        {address}      
      </div>
      <div>
      {/* <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        style={{ width: "100%" }}
      />   
      <button onClick={capturePhoto}>Chụp ảnh</button> */}
    </div>
    </div>
  );
};

function MyClickHandlerGetLocation({ onClick }) {
  const map = useMapEvent('click', (e) => {
    onClick(e);
  });
  
  return null;
}

export default App;

