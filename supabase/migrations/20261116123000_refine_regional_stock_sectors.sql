BEGIN;

UPDATE public.stocks
SET sector = 'Manufacturing & Allied'
WHERE symbol = 'DSE-USL' AND sector = 'Other';

UPDATE public.stocks
SET sector = 'Agricultural'
WHERE symbol = 'DSE-JATU' AND sector = 'Other';

UPDATE public.stocks
SET sector = 'Investment'
WHERE symbol = 'RSE-RHB' AND sector = 'Other';

COMMIT;
