import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const TABLE = 'assignments';

export function useAssignments() {
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    let cancelled = false;

    supabase
      .from(TABLE)
      .select('*')
      .then(({ data, error }) => {
        if (error || cancelled) return;
        const byId = {};
        for (const row of data) byId[row.doc_id] = row;
        setAssignments(byId);
      });

    const channel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload) => {
          setAssignments((prev) => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') {
              delete next[payload.old.doc_id];
            } else {
              next[payload.new.doc_id] = payload.new;
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateAssignment(docId, layer, territoryId, label, data, userEmail) {
    const { error } = await supabase.from(TABLE).upsert(
      {
        doc_id: docId,
        layer,
        territory_id: String(territoryId),
        label,
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: userEmail,
      },
      { onConflict: 'doc_id' }
    );
    if (error) throw error;
  }

  return { assignments, updateAssignment };
}
