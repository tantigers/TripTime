/** @format */

import React, { createRef } from 'react';
import { Map, Marker, Popup, TileLayer, withLeaflet } from 'react-leaflet';
import { OpenStreetMapProvider, SearchControl } from 'react-leaflet-geosearch';
import Control from 'react-leaflet-control';
import { IconButton } from '@material-ui/core';
import LocalActivityIcon from '@material-ui/icons/LocalActivity';
import AddLocationIcon from '@material-ui/icons/AddLocation';
import { generateActivityIcon } from './MarkerIcon';
import PropTypes from 'prop-types';
import MarkerSplitter from './MarkerSplitter';
import ActivityCard from '../cards/ActivityCard';
import styles from '../../css/map.module.css';
import axios from '../../app/axios';
import ReactLoading from 'react-loading';
import MomentUtils from '@date-io/moment';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import TravelMarkerPair from './TravelMarkerPair';
import _ from 'underscore';

export default class TripMap extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      map: {
        instance: createRef(),
        center: [-40.3523, 175.6082],
        currentCenter: undefined,
        zoom: 6,
      },
      inBrowser: false,
      activities: [],
      travels: [],
      activityLoading: true,
      travelLoading: true,
    };
  }

  componentDidMount() {
    const tripID = this.props.tripID;
    if (!tripID) return;

    this.setState({
      inBrowser: true,
    });

    axios
      .get(`/trip/${tripID}/activities`)
      .then(res => {
        const activities = res.data;

        this.setState(() => ({
          activities: activities,
        }));

        return activities.map(a => [a.gps.lat, a.gps.lng]);
      })
      .then(activityCoords => {
        this.setState(() => ({ activityLoading: false }));

        axios
          .get(`/trip/${tripID}/travels`)
          .then(res => {
            const travels = res.data;

            this.setState(() => ({
              travels: travels.map(t => {
                return {
                  ...t,
                  travel_rgb: generateRandomRGB(),
                };
              }),
            }));

            const travelFromCoords = travels.map(t => [t.from.lat, t.from.lng]);
            const travelToCoords = travels.map(t => [t.to.lat, t.to.lng]);
            const travelCoords = _.union(travelFromCoords, travelToCoords);

            return _.union(travelCoords, activityCoords);
          })
          .then(allCoords => {
            this.setState(() => ({ travelLoading: false }));

            this.map.leafletElement.fitBounds(allCoords, {
              padding: [10, 10],
            });
          });
      });
  }

  addTravel() {
    let date = new Date();
    let from_date = date.toJSON();
    date.setHours(date.getHours() + 1);
    let to_date = date.toJSON();

    const { lat, lng } = this.state.map.currentCenter;

    const travel = {
      id: null,
      mode: 'bus',
      description: 'Description here',
      from: {
        time: from_date,
        lat: (lat - 0.01).toString(),
        lng: (lng - 0.01).toString(),
      },
      to: {
        time: to_date,
        lat: (lat + 0.01).toString(),
        lng: (lng + 0.01).toString(),
      },
      travel_rgb: generateRandomRGB(),
    };

    this.setState(prevState => ({
      travels: [...prevState.travels, travel],
    }));
  }

  onMove(e) {
    this.setState(state => ({
      map: {
        ...state.map,
        currentCenter: e.target.getCenter(),
      },
    }));
  }

  submitUpdatedActivity(e, id) {
    if (id === null) alert('Created thing dragged');

    const tripId = this.props.tripID;
    const { lat, lng } = e.target.getLatLng();

    axios.patch(`/trip/${tripId}/activities`, {
      id: id,
      location: {
        lat: lat.toString(),
        lng: lng.toString(),
      },
    });
  }

  render() {
    if (!this.state.inBrowser) {
      return null;
    }

    const prov = new OpenStreetMapProvider();
    const GeoSearchControlElement = withLeaflet(SearchControl);

    let activities = this.state.activities;
    let activityMarkers = activities.map((a, i) => (
      <Marker
        key={i}
        position={a.gps}
        icon={generateActivityIcon(a.type)}
        draggable={true}
        onDragEnd={e => this.submitUpdatedActivity(e, a.id)}
      >
        <Popup>
          <ActivityCard
            onMap={true}
            activity={a}
            messageIfNoEvent={''}
            tripId={this.props.tripID}
          />
        </Popup>
      </Marker>
    ));

    let travels = this.state.travels;
    let travelMarkers = travels.map((t, i) => (
      <TravelMarkerPair travel={t} key={i} tripId={this.props.tripID} />
    ));

    return (
      <>
        <Map
          ref={ref => {
            this.map = ref;
          }}
          center={this.state.map.center}
          zoom={this.state.map.zoom}
          onMoveEnd={this.onMove.bind(this)}
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />

          <GeoSearchControlElement
            provider={prov}
            showPopup={false}
            showMarker={false}
            retainZoomLevel={false}
            animateZoom={true}
            autoClose={true}
            searchLabel={'Search for a location...'}
            keepResult={false}
          />

          <Control position='topleft'>
            <IconButton
              onClick={() => alert('Local activity button was clicked!')}
            >
              <LocalActivityIcon />
            </IconButton>

            <IconButton onClick={() => this.addTravel()}>
              <AddLocationIcon />
            </IconButton>
          </Control>

          <MarkerSplitter>
            <MuiPickersUtilsProvider utils={MomentUtils}>
              <>
                {travelMarkers}
                {activityMarkers}
              </>
            </MuiPickersUtilsProvider>
          </MarkerSplitter>
        </Map>

        {(this.state.activityLoading || this.state.travelLoading) && (
          <MapPlanLoading />
        )}
      </>
    );
  }
}

TripMap.propTypes = {
  activities: PropTypes.array,
  travels: PropTypes.array,
  tripID: PropTypes.string.isRequired,
};

function generateRandomRGB() {
  const goldenRatioConjugate = 0.618033988749895;
  let h = Math.random();
  h += goldenRatioConjugate;
  h %= 1;

  function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    const rd = Math.round;
    if (arguments.length === 1) {
      (s = h.s), (v = h.v), (h = h.h);
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        (r = v), (g = t), (b = p);
        break;
      case 1:
        (r = q), (g = v), (b = p);
        break;
      case 2:
        (r = p), (g = v), (b = t);
        break;
      case 3:
        (r = p), (g = q), (b = v);
        break;
      case 4:
        (r = t), (g = p), (b = v);
        break;
      case 5:
        (r = v), (g = p), (b = q);
        break;
    }
    return [rd(r * 255), rd(g * 255), rd(b * 255)];
  }

  return HSVtoRGB(h, 0.95, 0.7);
}

function MapPlanLoading() {
  return (
    <div className={styles.loading}>
      <div>
        <ReactLoading type='spinningBubbles' color='#ff4200' />
        <p> Loading your trip plan...</p>
      </div>
    </div>
  );
}
