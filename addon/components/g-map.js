import Ember from 'ember';
import layout from '../templates/components/g-map';

const { isEmpty, isPresent, computed, observer, run } = Ember;

export default Ember.Component.extend({
  layout,
  classNames: ['g-map'],
  bannedOptions: Ember.A(['center', 'zoom']),

  init() {
    this._super(...arguments);
    this.set('markers', Ember.A());
    this.set('polylines', Ember.A());
    if (isEmpty(this.get('options'))) {
      this.set('options', {});
    }
  },

  permittedOptions: computed('options', function() {
    const { options, bannedOptions } = this.getProperties(['options', 'bannedOptions']);
    const permittedOptions = {};
    for (let option in options) {
      if (options.hasOwnProperty(option) && !bannedOptions.includes(option)) {
        permittedOptions[option] = options[option];
      }
    }
    return permittedOptions;
  }),

  didInsertElement() {
    this._super(...arguments);
    if (isEmpty(this.get('map'))
      && (typeof FastBoot === 'undefined')) {
      const canvas = this.$().find('.g-map-canvas').get(0);
      const options = this.get('permittedOptions');
      this.set('map', new google.maps.Map(canvas, options));
    }
    this.setZoom();
    this.setCenter();
    this.registerEvents();
    if (this.get('shouldFit')) {
      this.fitToMarkers();
    }
  },

  permittedOptionsChanged: observer('permittedOptions', function() {
    run.once(this, 'setOptions');
  }),

  setOptions() {
    const map = this.get('map');
    const options = this.get('permittedOptions');
    if (isPresent(map)) {
      map.setOptions(options);
    }
  },

  zoomChanged: observer('zoom', function() {
    run.once(this, 'setZoom');
  }),

  setZoom() {
    const map = this.get('map');
    const zoom = this.get('zoom');
    if (isPresent(map)) {
      map.setZoom(zoom);
    }
  },

  coordsChanged: observer('lat', 'lng', function() {
    run.once(this, 'setCenter');
  }),

  setCenter() {
    const map = this.get('map');
    const lat = this.get('lat');
    const lng = this.get('lng');

    if (isPresent(map)
      && isPresent(lat)
      && isPresent(lng)
      && (typeof FastBoot === 'undefined')) {
      const center = new google.maps.LatLng(lat, lng);
      map.setCenter(center);
    }
  },

  registerMarker(marker) {
    this.get('markers').addObject(marker);
  },

  unregisterMarker(marker) {
    this.get('markers').removeObject(marker);
  },

  registerPolyline(polyline) {
    this.get('polylines').addObject(polyline);
  },

  unregisterPolyline(polyline) {
    this.get('polylines').removeObject(polyline);
  },

  shouldFit: computed('markersFitMode', function() {
    return Ember.A(['init', 'live']).includes(this.get('markersFitMode'));
  }),

  markersChanged: observer('markers.@each.lat', 'markers.@each.lng', function() {
    if (this.get('markersFitMode') === 'live') {
      run.once(this, 'fitToMarkers');
    }
  }),

  fitToMarkers() {
    const markers = this.get('markers').filter((marker) => {
      return isPresent(marker.get('lat')) && isPresent(marker.get('lng'));
    });

    if (markers.length === 0
        || (typeof FastBoot !== 'undefined')) {
      return;
    }

    const map = this.get('map');
    const bounds = new google.maps.LatLngBounds();

    markers.forEach((marker) => {
      if (isPresent(marker.get('viewport'))) {
        bounds.union(marker.get('viewport'));
      } else {
        bounds.extend(new google.maps.LatLng(marker.get('lat'), marker.get('lng')));
      }
    });
    map.fitBounds(bounds);
  },

  groupMarkerClicked(marker, group) {
    let markers = this.get('markers').without(marker).filterBy('group', group);
    markers.forEach((marker) => marker.closeInfowindow());
  },

  registerEvents() {
    const map = this.get("map");
    if (isPresent(map)) {
      map.addListener("dragend", (e) => {
        this._sendBounds();
      });
      map.addListener("zoom_changed", (e) => {
        this._sendBounds();
      });
    }
  },

  _sendBounds() {
    const map = this.get("map");
    if (isPresent(map)) {
      const bounds = map.getBounds();
      if (isPresent(bounds)) {
        const ne = {lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng()}
        const sw = {lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng()}
        const center = {lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng()}
        this.sendAction("boundsChanged", {ne, sw, center});
      }
    }
  }
});
