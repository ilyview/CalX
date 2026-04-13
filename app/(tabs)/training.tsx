import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { getWorkoutPlans, saveWorkoutPlans, getSchedule, saveSchedule } from '../../utils/storage';
import { WorkoutPlan, Exercise, DaySchedule } from '../../utils/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function getTodayIdx() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }

export default function TrainingScreen() {
  const { theme: T } = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule>({});
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDay, setScheduleDay] = useState<string | null>(null);
  const [exModal, setExModal] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exWeight, setExWeight] = useState('');
  const [exNotes, setExNotes] = useState('');
  const [editExModal, setEditExModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExSets, setEditExSets] = useState('');
  const [editExReps, setEditExReps] = useState('');
  const [editExWeight, setEditExWeight] = useState('');
  const [editExNotes, setEditExNotes] = useState('');

  const load = useCallback(async () => {
    const p = await getWorkoutPlans(); const s = await getSchedule();
    setPlans(p); setSchedule(s);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selectedPlan) { const u = plans.find((p) => p.id === selectedPlan.id); if (u) setSelectedPlan(u); }
  }, [plans]);

  const card = (extra?: object) => ([
    { backgroundColor: T.card, borderRadius: T.radius, padding: 16 },
    T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {},
    extra || {},
  ]);

  const inputStyle = { backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const confirmBtn = { flex: 1, backgroundColor: T.accent, borderRadius: T.radius, padding: 15, alignItems: 'center' as const };
  const cancelBtn = { flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 15, alignItems: 'center' as const, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const modalCard = { backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44, ...(T.cardBorder ? { borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: T.cardBorder } : {}) };

  const handleCreatePlan = async () => {
    if (!planName.trim()) { Alert.alert('Name required', 'Enter a name for the plan.'); return; }
    const newPlan: WorkoutPlan = { id: Date.now().toString(), name: planName.trim(), exercises: [] };
    const updated = [...plans, newPlan];
    await saveWorkoutPlans(updated); setPlans(updated); setPlanName(''); setCreateModal(false);
  };
  const handleDeletePlan = (id: string) => {
    Alert.alert('Delete Plan', 'Remove this plan?', [
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
    if (!exName.trim() || !exSets.trim() || !exReps.trim()) { Alert.alert('Missing info', 'Name, sets and reps required.'); return; }
    if (!selectedPlan) return;
    const ex: Exercise = { id: Date.now().toString(), name: exName.trim(), sets: parseInt(exSets) || 3, reps: exReps.trim(), weight: exWeight.trim() || undefined, notes: exNotes.trim() || undefined };
    const up = { ...selectedPlan, exercises: [...selectedPlan.exercises, ex] };
    const ups = plans.map((p) => p.id === selectedPlan.id ? up : p);
    await saveWorkoutPlans(ups); setPlans(ups); setSelectedPlan(up);
    setExName(''); setExSets(''); setExReps(''); setExWeight(''); setExNotes(''); setExModal(false);
  };
  const openEditExercise = (ex: Exercise) => {
    setEditingEx(ex); setEditExName(ex.name); setEditExSets(ex.sets.toString());
    setEditExReps(ex.reps); setEditExWeight(ex.weight || ''); setEditExNotes(ex.notes || '');
    setEditExModal(true);
  };
  const handleEditExercise = async () => {
    if (!editExName.trim() || !editExSets.trim() || !editExReps.trim()) { Alert.alert('Missing info', 'Name, sets and reps required.'); return; }
    if (!selectedPlan || !editingEx) return;
    const upEx: Exercise = { ...editingEx, name: editExName.trim(), sets: parseInt(editExSets) || 3, reps: editExReps.trim(), weight: editExWeight.trim() || undefined, notes: editExNotes.trim() || undefined };
    const up = { ...selectedPlan, exercises: selectedPlan.exercises.map((e) => e.id === editingEx.id ? upEx : e) };
    const ups = plans.map((p) => p.id === selectedPlan.id ? up : p);
    await saveWorkoutPlans(ups); setPlans(ups); setSelectedPlan(up); setEditExModal(false); setEditingEx(null);
  };
  const handleDeleteExercise = async (exId: string) => {
    if (!selectedPlan) return;
    const up = { ...selectedPlan, exercises: selectedPlan.exercises.filter((e) => e.id !== exId) };
    const ups = plans.map((p) => p.id === selectedPlan.id ? up : p);
    await saveWorkoutPlans(ups); setPlans(ups); setSelectedPlan(up);
  };
  const handleAssignDay = async (planId: string | null) => {
    if (!scheduleDay) return;
    const newSched = { ...schedule, [scheduleDay]: planId };
    await saveSchedule(newSched); setSchedule(newSched); setScheduleModal(false); setScheduleDay(null);
  };

  const todayIdx = getTodayIdx();
  const todayPlan = plans.find((p) => p.id === schedule[DAYS[todayIdx]]);

  const ExModal = ({ visible, title, onClose, onSave, name, setName, sets, setSets, reps, setReps, weight, setWeight, notes, setNotes, saveLabel }: any) => (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={modalCard}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>{title}</Text>
              <TextInput style={inputStyle} placeholder="Exercise name *" placeholderTextColor={T.sub} value={name} onChangeText={setName} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Sets *" placeholderTextColor={T.sub} value={sets} onChangeText={setSets} keyboardType="numeric" />
                <TextInput style={[inputStyle, { flex: 1.5 }]} placeholder="Reps * (e.g. 8-10)" placeholderTextColor={T.sub} value={reps} onChangeText={setReps} />
                <TextInput style={[inputStyle, { flex: 1.2 }]} placeholder="Weight" placeholderTextColor={T.sub} value={weight} onChangeText={setWeight} />
              </View>
              <TextInput style={inputStyle} placeholder="Notes (optional)" placeholderTextColor={T.sub} value={notes} onChangeText={setNotes} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity style={cancelBtn} onPress={onClose}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={confirmBtn} onPress={onSave}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>{saveLabel}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (selectedPlan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 10 }}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '800', color: T.text, flex: 1 }} numberOfLines={1}>{selectedPlan.name}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {selectedPlan.exercises.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 44, gap: 6 }}>
              <Ionicons name="barbell-outline" size={36} color={T.sub} />
              <Text style={{ color: T.sub, fontSize: 15, fontWeight: '600' }}>No exercises yet</Text>
              <Text style={{ color: T.sub, fontSize: 13, opacity: 0.6 }}>Tap + to add your first exercise</Text>
            </View>
          ) : (
            selectedPlan.exercises.map((ex, i) => (
              <TouchableOpacity key={ex.id} style={[...card(), { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, shadowColor: T.accent, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 }]} onPress={() => openEditExercise(ex)} activeOpacity={0.75}>
                <View style={{ width: 34, height: 34, borderRadius: T.name === 'minecraft' ? 3 : 17, backgroundColor: T.accent + '25', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 14 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: T.text, fontWeight: '600' }}>{ex.name}</Text>
                  <Text style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{ex.sets} × {ex.reps}{ex.weight ? `  ·  ${ex.weight}` : ''}</Text>
                  {ex.notes ? <Text style={{ fontSize: 12, color: T.sub, opacity: 0.7, marginTop: 3 }}>{ex.notes}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <Ionicons name="pencil-outline" size={16} color={T.sub} />
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={17} color={T.sub} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={{ position: 'absolute', bottom: 26, right: 22, backgroundColor: T.accent, width: 58, height: 58, borderRadius: T.name === 'minecraft' ? 4 : 29, alignItems: 'center', justifyContent: 'center', shadowColor: T.accent, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }} onPress={() => setExModal(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color={T.accentText} />
        </TouchableOpacity>
        <ExModal visible={exModal} title={T.name === 'minecraft' ? '⚒️ Add Exercise' : 'Add Exercise'} onClose={() => setExModal(false)} onSave={handleAddExercise} name={exName} setName={setExName} sets={exSets} setSets={setExSets} reps={exReps} setReps={setExReps} weight={exWeight} setWeight={setExWeight} notes={exNotes} setNotes={setExNotes} saveLabel="Add" />
        <ExModal visible={editExModal} title="Edit Exercise" onClose={() => setEditExModal(false)} onSave={handleEditExercise} name={editExName} setName={setEditExName} sets={editExSets} setSets={setEditExSets} reps={editExReps} setReps={setEditExReps} weight={editExWeight} setWeight={setEditExWeight} notes={editExNotes} setNotes={setEditExNotes} saveLabel="Save" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          {T.name === 'minecraft' ? '⚒️ Training' : 'Training'}
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Today */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 10 }}>Today · {DAYS[todayIdx]}</Text>
          {todayPlan ? (
            <TouchableOpacity style={[...card(), { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: T.accent, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }]} onPress={() => setSelectedPlan(todayPlan)} activeOpacity={0.8}>
              <View>
                <Text style={{ fontSize: 19, fontWeight: '700', color: T.text }}>{todayPlan.name}</Text>
                <Text style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{todayPlan.exercises.length} exercises</Text>
              </View>
              <View style={{ width: 36, height: 36, borderRadius: T.name === 'minecraft' ? 3 : 18, backgroundColor: T.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={14} color={T.accent} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[...card(), { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Text style={{ fontSize: 22 }}>💤</Text>
              <Text style={{ color: T.sub, fontSize: 16 }}>Rest day</Text>
            </View>
          )}
        </View>

        {/* Schedule */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 10 }}>Weekly Schedule</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map((day, i) => {
              const plan = plans.find((p) => p.id === schedule[day]);
              const isToday = i === todayIdx;
              return (
                <TouchableOpacity key={day} style={[{ flex: 1, backgroundColor: T.card, borderRadius: T.radius, padding: 8, alignItems: 'center', minHeight: 64, justifyContent: 'flex-start' }, isToday ? { borderWidth: 2, borderColor: T.accent } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]} onPress={() => { setScheduleDay(day); setScheduleModal(true); }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isToday ? T.accent : T.text, marginBottom: 4 }}>{day}</Text>
                  <Text style={{ fontSize: 9, color: T.sub, textAlign: 'center', lineHeight: 13 }} numberOfLines={2}>{plan ? plan.name : '—'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Plans */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text }}>My Plans</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setCreateModal(true)}>
              <Ionicons name="add" size={16} color={T.accent} />
              <Text style={{ color: T.accent, fontWeight: '600', fontSize: 14 }}>New</Text>
            </TouchableOpacity>
          </View>
          {plans.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 44, gap: 6 }}>
              <Text style={{ color: T.sub, fontSize: 15, fontWeight: '600' }}>No plans yet</Text>
              <Text style={{ color: T.sub, fontSize: 13, opacity: 0.6 }}>Create a plan to get started</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={[...card(), { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedPlan(plan)}>
                  <Text style={{ fontSize: 16, color: T.text, fontWeight: '600' }}>{plan.name}</Text>
                  <Text style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{plan.exercises.length} exercises</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeletePlan(plan.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={17} color={T.sub} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={scheduleModal} animationType="slide" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setScheduleModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={modalCard}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>Assign — {scheduleDay}</Text>
                {[{ id: null, name: 'Rest day' }, ...plans].map((item) => (
                  <TouchableOpacity key={item.id ?? 'rest'} style={[{ backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, (item.id === null ? !schedule[scheduleDay!] : schedule[scheduleDay!] === item.id) ? { borderWidth: 2, borderColor: T.accent } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]} onPress={() => handleAssignDay(item.id)}>
                    <Text style={{ color: T.text, fontSize: 15 }}>{item.name}</Text>
                    {(item.id === null ? !schedule[scheduleDay!] : schedule[scheduleDay!] === item.id) && <Ionicons name="checkmark" size={18} color={T.accent} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={{ ...cancelBtn, flex: undefined, marginTop: 4 }} onPress={() => setScheduleModal(false)}>
                  <Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
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
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={modalCard}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>{T.name === 'minecraft' ? '📋 New Plan' : 'New Plan'}</Text>
                <TextInput style={inputStyle} placeholder="e.g. Push Day, Leg Day..." placeholderTextColor={T.sub} value={planName} onChangeText={setPlanName} autoFocus />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={cancelBtn} onPress={() => setCreateModal(false)}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={confirmBtn} onPress={handleCreatePlan}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Create</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
