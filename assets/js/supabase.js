const supabaseUrl = "https://qvlmbpvwmyggqkhcjodh.supabase.co";
const supabaseKey = "sb_publishable_SnLcufl2qAdr8I0CzToHSw_SycbNUTs";

if (!window.supabase) {
  throw new Error("A Supabase könyvtár nem töltődött be. Ellenőrizd az internetkapcsolatot vagy a CDN scriptet.");
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

export default supabase;
