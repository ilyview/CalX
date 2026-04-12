import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutPlans, saveWorkoutPlans, getSchedule, saveSchedule } from '../../utils/storage';
import { WorkoutPlan, Exercise, DaySchedule } from '../../utils/types';

const ACCENT = '#a78bfa';
const GLOW = { shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 };
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#f0f0f0';
const SUB = '#666';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTodayIdx() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }

export default function TrainingScreen() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule>({});
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  const [createModal, setCreateModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDay, setScheduleDay] = useState<string | null>(null);

  // Add exercise modal
  const [exModal, setExModal] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exWeight, setExWeight] = useState('');
  const [exNotes, setExNotes] = useState('');

  // Edit exercise modal
  const [editExModal, setEditExModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExSets, setEditExSets] = useState('');
  const [editExReps, setEditExReps] = useState('');
  const [editExWeight, setEditExWeight] = useState('');
  const [editExNotes, setEditExNotes] = useState('');

  const load = useCallback(async () => {
    const p = await getWorkoutPlans();
    const s = await getSchedule();
    setPlans(p); setSchedule(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedPlan) {
      const updated = plans.find((p) => p.id === selectedPlan.id);
      if (updated) setSelectedPlan(updated);
    }
  }, [plans]);

  const handleCreatePlan = async () => {
    if (!planName.trim()) { Alert.alert('Name required', 'Enter a name for the plan.'); return; }
    const newPlan: WorkoutPlan = { id: Date.now().toString(), name: planName.trim(), exercises: [] };
    const updated = [...plans, newPlan];
    await saveWorkoutPlans(updated);
    setPlans(updated); setPlanName(''); setCreateModal(false);
  };

  const handleDeletePlan = (id: string) => {
    Alert.alert('Delete Plan', 'This will remove the plan and its schedule entries.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = plans.filter((p) => p.id !== id);
        const newSched = { ...schedule };
        Object.keys(newSched).forEach((day) => { if (newSched[day] === id) newSched[day] = null; });
        await saveWorkoutPlans(updated); await saveSchedule(newSched);
        setPlans(updated); setSchedule(newSched);
        if (selectedPlan?.id === id) setSelectedPlan(null);
      }},
    ]);
  };

  const handleAddExercise = async () => {
    if (!exName.trim() || !exSets.trim() || !exReps.trim()) { Alert.alert('Missing info', 'Name, sets, and reps are required.'); return; }
    if (!selectedPlan) return;
    const ex: Exercise = { id: Date.now().toString(), name: exName.trim(), sets: parseInt(exSets) || 3, reps: exReps.trim(), weight: exWeight.trim() || undefined, notes: exNotes.trim() || undefined };
    const updatedPlan = { ...selectedPlan, exercises: [...selectedPlan.exercises, ex] };
    const updatedPlans = plans.map((p) => (p.id === selectedPlan.id ? updatedPlan : p));
    await saveWorkoutPlans(updatedPlans);
    setPlans(updatedPlans); setSelectedPlan(updatedPlan);
    setExName(''); setExSets(''); setExReps(''); setExWeight(''); setExNotes(''); setExModal(false);
  };

  const openEditExercise = (ex: Exercise) => {
    setEditingEx(ex);
    setEditExName(ex.name);
    setEditExSets(ex.sets.toString());
    setEditExReps(ex.reps);
    setEditExWeight(ex.weight || '');
    setEditExNotes(ex.notes || '');
    setEditExModal(true);
  };

  const handleEditExercise = async () => {
    if (!editExName.trim() || !editExSets.trim() || !editExReps.trim()) { Alert.alert('Missing info', 'Name, sets, and reps are required.'); return; }
    if (!selectedPlan || !editingEx) return;
    const updatedEx: Exercise = { ...editingEx, name: editExName.trim(), sets: parseInt(editExSets) || 3, reps: editExReps.trim(), weight: editExWeight.trim() || undefined, notes: editExNotes.trim() || undefined };
    const updatedPlan = { ...selectedPlan, exercises: selectedPlan.exercises.map((e) => e.id === editingEx.id ? updatedEx : e) };
    const updatedPlans = plans.map((p) => p.id === selectedPlan.id ? updatedPlan : p);
    await saveWorkoutPlans(updatedPlans);
    setPlans(updatedPlans); setSelectedPlan(updatedPlan); setEditExModal(false); setEditingEx(null);
  };

  const handleDeleteExercise = async (exId: string) => {
    if (!selectedPlan) return;
    const updatedPlan = { ...selectedPlan, exercises: selectedPlan.exercises.filter((e) => e.id !== exId) };
    const updatedPlans = plans.map((p) => p.id === selectedPlan.id ? updatedPlan : p);
    await saveWorkoutPlans(updatedPlans);
    setPlans(updatedPlans); setSelectedPlan(updatedPlan);
  };

  const handleAssignDay = async (planId: string | null) => {
    if (!scheduleDay) return;
    const newSched = { ...schedule, [scheduleDay]: planId };
    await saveSchedule(newSched); setSchedule(newSched); setScheduleModal(false); setScheduleDay(null);
  };

  const todayIdx = getTodayIdx();
  const todayPlanId = schedule[DAYS[todayIdx]];
  const todayPlan = plans.find((p) => p.id === todayPlanId);

  // ── Plan detail view ─────────────────────────────────────────
  if (selectedPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedPlan.name}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {selectedPlan.exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="barbell-outline" size={36} color="#2a2a2a" />
              <Text style={styles.emptyTxt}>No exercises yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first exercise</Text>
            </View>
          ) : (
            selectedPlan.exercises.map((ex, i) => (
              <TouchableOpacity key={ex.id} style={styles.exCard} onPress={() => openEditExercise(ex)} activeOpacity={0.75}>
                <View style={styles.exBadge}>
                  <Text style={styles.exBadgeTxt}>{i + 1}</Text>
                </View>
                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exDetail}>{ex.sets} × {ex.reps}{ex.weight ? `  ·  ${ex.weight}` : ''}</Text>
                  {ex.notes ? <Text style={styles.exNoteTxt}>{ex.notes}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <Ionicons name="pencil-outline" size={16} color="#3a3a3a" />
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={17} color="#3a3a3a" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={() => setExModal(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Add Exercise Modal */}
        <Modal visible={exModal} animationType="slide" transparent statusBarTranslucent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.overlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Add Exercise</Text>
                  <TextInput style={styles.input} placeholder="Exercise name *" placeholderTextColor={SUB} value={exName} onChangeText={setExName} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Sets *" placeholderTextColor={SUB} value={exSets} onChangeText={setExSets} keyboardType="numeric" />
                    <TextInput style={[styles.input, { flex: 1.5 }]} placeholder="Reps * (e.g. 8-10)" placeholderTextColor={SUB} value={exReps} onChangeText={setExReps} />
                    <TextInput style={[styles.input, { flex: 1.2 }]} placeholder="Weight" placeholderTextColor={SUB} value={exWeight} onChangeText={setExWeight} />
                  </View>
                  <TextInput style={styles.input} placeholder="Notes (optional)" placeholderTextColor={SUB} value={exNotes} onChangeText={setExNotes} />
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setExModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleAddExercise}><Text style={styles.confirmTxt}>Add</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Exercise Modal */}
        <Modal visible={editExModal} animationType="slide" transparent statusBarTranslucent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.overlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Edit Exercise</Text>
                  <TextInput style={styles.input} placeholder="Exercise name *" placeholderTextColor={SUB} value={editExName} onChangeText={setEditExName} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Sets *" placeholderTextColor={SUB} value={editExSets} onChangeText={setEditExSets} keyboardType="numeric" />
                    <TextInput style={[styles.input, { flex: 1.5 }]} placeholder="Reps * (e.g. 8-10)" placeholderTextColor={SUB} value={editExReps} onChangeText={setEditExReps} />
                    <TextInput style={[styles.input, { flex: 1.2 }]} placeholder="Weight" placeholderTextColor={SUB} value={editExWeight} onChangeText={setEditExWeight} />
                  </View>
                  <TextInput style={styles.input} placeholder="Notes (optional)" placeholderTextColor={SUB} value={editExNotes} onChangeText={setEditExNotes} />
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditExModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleEditExercise}><Text style={styles.confirmTxt}>Save</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Main screen ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today · {DAYS[todayIdx]}</Text>
          {todayPlan ? (
            <TouchableOpacity style={[styles.card, GLOW, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectedPlan(todayPlan)} activeOpacity={0.8}>
              <View>
                <Text style={{ fontSize: 19, fontWeight: '700', color: TEXT }}>{todayPlan.name}</Text>
                <Text style={{ fontSize: 13, color: SUB, marginTop: 3 }}>{todayPlan.exercises.length} exercises</Text>
              </View>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#a78bfa22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={14} color="#a78bfa" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Text style={{ fontSize: 22 }}>💤</Text>
              <Text style={{ color: SUB, fontSize: 16 }}>Rest day</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map((day, i) => {
              const plan = plans.find((p) => p.id === schedule[day]);
              const isToday = i === todayIdx;
              return (
                <TouchableOpacity key={day} style={[styles.dayCell, isToday && styles.todayCell]} onPress={() => { setScheduleDay(day); setScheduleModal(true); }}>
                  <Text style={[{ fontSize: 11, fontWeight: '700', color: TEXT, marginBottom: 4 }, isToday && { color: '#a78bfa' }]}>{day}</Text>
                  <Text style={{ fontSize: 9, color: SUB, textAlign: 'center', lineHeight: 13 }} numberOfLines={2}>{plan ? plan.name : '—'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>My Plans</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setCreateModal(true)}>
              <Ionicons name="add" size={16} color={ACCENT} />
              <Text style={{ color: '#a78bfa', fontWeight: '600', fontSize: 14 }}>New</Text>
            </TouchableOpacity>
          </View>
          {plans.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTxt}>No plans yet</Text>
              <Text style={styles.emptySub}>Create a plan to get started</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedPlan(plan)}>
                  <Text style={{ fontSize: 16, color: TEXT, fontWeight: '600' }}>{plan.name}</Text>
                  <Text style={{ fontSize: 12, color: SUB, marginTop: 2 }}>{plan.exercises.length} exercises</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeletePlan(plan.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={17} color="#3a3a3a" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={scheduleModal} animationType="slide" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setScheduleModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Assign — {scheduleDay}</Text>
                <TouchableOpacity style={[styles.pickItem, !schedule[scheduleDay!] && styles.pickSelected]} onPress={() => handleAssignDay(null)}>
                  <Text style={styles.pickTxt}>Rest day</Text>
                  {!schedule[scheduleDay!] && <Ionicons name="checkmark" size={18} color="#a78bfa" />}
                </TouchableOpacity>
                {plans.map((plan) => (
                  <TouchableOpacity key={plan.id} style={[styles.pickItem, schedule[scheduleDay!] === plan.id && styles.pickSelected]} onPress={() => handleAssignDay(plan.id)}>
                    <Text style={styles.pickTxt}>{plan.name}</Text>
                    {schedule[scheduleDay!] === plan.id && <Ionicons name="checkmark" size={18} color="#a78bfa" />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.cancelBtn, { marginTop: 8 }]} onPress={() => setScheduleModal(false)}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Create Plan Modal */}
      <Modal visible={createModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>New Plan</Text>
                <TextInput style={styles.input} placeholder="e.g. Push Day, Leg Day..." placeholderTextColor={SUB} value={planName} onChangeText={setPlanName} autoFocus />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePlan}><Text style={styles.confirmTxt}>Create</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 10 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: TEXT, flex: 1, letterSpacing: -0.5 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16 },
  dayCell: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 8, alignItems: 'center', minHeight: 64, justifyContent: 'flex-start' },
  todayCell: { borderWidth: 1.5, borderColor: '#a78bfa' },
  exCard: { backgroundColor: CARD, borderRadius: 13, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: ACCENT, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  exBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT + '25', alignItems: 'center', justifyContent: 'center' },
  exBadgeTxt: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, color: TEXT, fontWeight: '600' },
  exDetail: { fontSize: 13, color: SUB, marginTop: 3 },
  exNoteTxt: { fontSize: 12, color: '#444', marginTop: 3 },
  emptyBox: { alignItems: 'center', paddingVertical: 44, gap: 6 },
  emptyTxt: { color: '#444', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#333', fontSize: 13 },
  fab: { position: 'absolute', bottom: 26, right: 22, backgroundColor: ACCENT, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#181818', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 18 },
  input: { backgroundColor: '#222', borderRadius: 11, padding: 14, color: TEXT, fontSize: 15, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#222', borderRadius: 11, padding: 15, alignItems: 'center' },
  cancelTxt: { color: SUB, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 11, padding: 15, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickItem: { backgroundColor: '#222', borderRadius: 11, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickSelected: { borderWidth: 1.5, borderColor: '#a78bfa' },
  pickTxt: { color: TEXT, fontSize: 15 },
});
