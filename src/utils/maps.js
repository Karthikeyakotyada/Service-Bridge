import { Linking, Platform } from "react-native";

export function openDirections(destLat, destLng) {
  if (destLat == null || destLng == null) return;

  const destination = `${destLat},${destLng}`;

  // Google Maps directions (Android + also works on iOS if installed)
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}&travelmode=driving`;

  // Apple Maps directions (iOS)
  const appleUrl = `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;

  const url = Platform.OS === "ios" ? appleUrl : googleUrl;
  return Linking.openURL(url);
}