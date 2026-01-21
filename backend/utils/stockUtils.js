const supabase = require("../config/supabase");

const isDemoMode = !process.env.JWT_SECRET;

const getChekiStock = async () => {
    if (isDemoMode) return 100;

    const { data, error } = await supabase.from('pengaturan').select('nilai').eq('nama', 'stok_cheki').single();
    if (error || !data) return 0;
    return parseInt(data.nilai, 10);
};

module.exports = { getChekiStock };
