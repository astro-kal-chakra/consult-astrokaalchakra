/**
 * Built-in birth places, used in demo mode and when the backend place search can't be reached. Live mode searches the
 * backend's full list (/web/places/search, the same one the main website uses). Any other place can be entered with
 * coordinates.
 */
const IN = [
  ["Delhi", "Delhi", 28.6139, 77.209], ["New Delhi", "Delhi", 28.6139, 77.209], ["Mumbai", "Maharashtra", 19.076, 72.8777], ["Kolkata", "West Bengal", 22.5726, 88.3639],
  ["Chennai", "Tamil Nadu", 13.0827, 80.2707], ["Bengaluru", "Karnataka", 12.9716, 77.5946], ["Hyderabad", "Telangana", 17.385, 78.4867], ["Pune", "Maharashtra", 18.5204, 73.8567],
  ["Ahmedabad", "Gujarat", 23.0225, 72.5714], ["Surat", "Gujarat", 21.1702, 72.8311], ["Vadodara", "Gujarat", 22.3072, 73.1812], ["Rajkot", "Gujarat", 22.3039, 70.8022],
  ["Jaipur", "Rajasthan", 26.9124, 75.7873], ["Jodhpur", "Rajasthan", 26.2389, 73.0243], ["Udaipur", "Rajasthan", 24.5854, 73.7125], ["Kota", "Rajasthan", 25.2138, 75.8648],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462], ["Kanpur", "Uttar Pradesh", 26.4499, 80.3319], ["Varanasi", "Uttar Pradesh", 25.3176, 82.9739], ["Prayagraj", "Uttar Pradesh", 25.4358, 81.8463],
  ["Agra", "Uttar Pradesh", 27.1767, 78.0081], ["Mathura", "Uttar Pradesh", 27.4924, 77.6737], ["Meerut", "Uttar Pradesh", 28.9845, 77.7064], ["Gorakhpur", "Uttar Pradesh", 26.7606, 83.3732],
  ["Noida", "Uttar Pradesh", 28.5355, 77.391], ["Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538], ["Gurugram", "Haryana", 28.4595, 77.0266], ["Faridabad", "Haryana", 28.4089, 77.3178],
  ["Chandigarh", "Chandigarh", 30.7333, 76.7794], ["Amritsar", "Punjab", 31.634, 74.8723], ["Ludhiana", "Punjab", 30.901, 75.8573], ["Jalandhar", "Punjab", 31.326, 75.5762],
  ["Dehradun", "Uttarakhand", 30.3165, 78.0322], ["Haridwar", "Uttarakhand", 29.9457, 78.1642], ["Shimla", "Himachal Pradesh", 31.1048, 77.1734], ["Jammu", "Jammu and Kashmir", 32.7266, 74.857],
  ["Srinagar", "Jammu and Kashmir", 34.0837, 74.7973], ["Bhopal", "Madhya Pradesh", 23.2599, 77.4126], ["Indore", "Madhya Pradesh", 22.7196, 75.8577], ["Ujjain", "Madhya Pradesh", 23.1765, 75.7885],
  ["Gwalior", "Madhya Pradesh", 26.2183, 78.1828], ["Jabalpur", "Madhya Pradesh", 23.1815, 79.9864], ["Raipur", "Chhattisgarh", 21.2514, 81.6296], ["Patna", "Bihar", 25.5941, 85.1376],
  ["Gaya", "Bihar", 24.7914, 85.0002], ["Ranchi", "Jharkhand", 23.3441, 85.3096], ["Jamshedpur", "Jharkhand", 22.8046, 86.2029], ["Bhubaneswar", "Odisha", 20.2961, 85.8245],
  ["Puri", "Odisha", 19.8135, 85.8312], ["Guwahati", "Assam", 26.1445, 91.7362], ["Shillong", "Meghalaya", 25.5788, 91.8933], ["Nagpur", "Maharashtra", 21.1458, 79.0882],
  ["Nashik", "Maharashtra", 19.9975, 73.7898], ["Aurangabad", "Maharashtra", 19.8762, 75.3433], ["Kolhapur", "Maharashtra", 16.705, 74.2433], ["Panaji", "Goa", 15.4909, 73.8278],
  ["Kochi", "Kerala", 9.9312, 76.2673], ["Thiruvananthapuram", "Kerala", 8.5241, 76.9366], ["Kozhikode", "Kerala", 11.2588, 75.7804], ["Coimbatore", "Tamil Nadu", 11.0168, 76.9558],
  ["Madurai", "Tamil Nadu", 9.9252, 78.1198], ["Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047], ["Mysuru", "Karnataka", 12.2958, 76.6394], ["Mangaluru", "Karnataka", 12.9141, 74.856],
  ["Hubballi", "Karnataka", 15.3647, 75.124], ["Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185], ["Vijayawada", "Andhra Pradesh", 16.5062, 80.648], ["Tirupati", "Andhra Pradesh", 13.6288, 79.4192],
  ["Warangal", "Telangana", 17.9689, 79.5941], ["Siliguri", "West Bengal", 26.7271, 88.3953], ["Durgapur", "West Bengal", 23.5204, 87.3119], ["Ayodhya", "Uttar Pradesh", 26.7922, 82.1998],
].map(([name, state, lat, lng]) => ({ id: `in-${name.toLowerCase().replace(/\s+/g, "-")}`, name, region: `${state}, India`, lat, lng, timezone: "Asia/Kolkata" }));

const WORLD = [
  ["Kathmandu", "Nepal", 27.7172, 85.324, "Asia/Kathmandu"], ["Dhaka", "Bangladesh", 23.8103, 90.4125, "Asia/Dhaka"], ["Colombo", "Sri Lanka", 6.9271, 79.8612, "Asia/Colombo"],
  ["Dubai", "United Arab Emirates", 25.2048, 55.2708, "Asia/Dubai"], ["Singapore", "Singapore", 1.3521, 103.8198, "Asia/Singapore"], ["London", "United Kingdom", 51.5074, -0.1278, "Europe/London"],
  ["New York", "United States", 40.7128, -74.006, "America/New_York"], ["Toronto", "Canada", 43.6532, -79.3832, "America/Toronto"], ["Sydney", "Australia", -33.8688, 151.2093, "Australia/Sydney"],
].map(([name, country, lat, lng, timezone]) => ({ id: `w-${name.toLowerCase().replace(/\s+/g, "-")}`, name, region: country, lat, lng, timezone }));

const ALL = [...IN, ...WORLD];

export function searchCities(q, limit = 8) {
  const s = String(q || "").trim().toLowerCase();
  if (s.length < 2) return [];
  const starts = ALL.filter((c) => c.name.toLowerCase().startsWith(s));
  const contains = ALL.filter((c) => !starts.includes(c) && c.name.toLowerCase().includes(s));
  return [...starts, ...contains].slice(0, limit);
}
