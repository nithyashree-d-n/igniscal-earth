# Scientific and Operational Limitations

FireSignal is a decision-support, research, and environmental intelligence tool. Users must understand the following physical and operational constraints:

1. **Thermal Anomalies are Not Burned Area**
   A satellite hotspot indicates sub-pixel radiant heat at the precise moment of overpass. Detection counts do NOT measure burned acreage or severity.

2. **Fire Radiative Power (MW) is Not Total Energy or Damage**
   FRP measures instantaneous rate of radiative heat release (in megawatts) during the satellite observation window. It is not equivalent to total fire energy or economic loss.

3. **Cloud, Smoke, and Canopy Obscuration**
   Heavy cloud decks, dense smoke plumes, and thick forest canopies absorb or scatter thermal infrared photons, preventing detection of active understory fires.

4. **Orbital Sampling Geometry & Overpass Timing**
   Polar-orbiting satellites typically sample each terrestrial coordinate 2 to 4 times per 24-hour cycle. Fires that start, flare, and extinguish between overpass windows will not appear in the dataset.

5. **Hotspot Counts Depend on Sensor Spatial Resolution**
   VIIRS (375 m) detects smaller, cooler, and fragmented fires that MODIS (1 km) cannot resolve. VIIRS counts are regularly 2x to 4x higher than MODIS over identical fire events.

6. **Confidence Values are Not Cross-Sensor Equivalent**
   MODIS outputs numeric percentage probability (0–100%), whereas VIIRS outputs categorical classes (`low`, `nominal`, `high`). They are mapped into distinct classes and must not be treated as identical measurements.

7. **No Wildfire Prediction or Ignition Forecasting**
   FireSignal detects statistically unusual observed fire activity relative to historical baselines. It does NOT predict where future wildfires will ignite.
