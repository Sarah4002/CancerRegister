import { useEffect, useMemo, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'https://cancerregister-1.onrender.com/api/v1').replace(/\/$/, '');
const OPTIONS = [
  { key: 'tabagisme', title: 'Tabagisme', question: 'Avez-vous déjà consommé ou consommez-vous du tabac ?', choices: [['non', 'Non-fumeur'], ['ex', 'Ex-fumeur'], ['actif', 'Fumeur actif'], ['inconnu', 'Je préfère ne pas répondre']] },
  { key: 'alcool', title: "Consommation d’alcool", question: 'Consommez-vous des boissons alcoolisées ?', choices: [['non', 'Non'], ['oui', 'Oui'], ['inconnu', 'Je préfère ne pas répondre']] },
  { key: 'activite_physique', title: 'Activité physique', question: 'Comment décrivez-vous votre niveau d’activité physique ?', choices: [['active', 'Active'], ['moderee', 'Modérée'], ['sedentaire', 'Sédentaire'], ['inconnu', 'Je préfère ne pas répondre']] },
  { key: 'alimentation', title: 'Alimentation', question: 'Comment décrivez-vous votre alimentation habituelle ?', choices: [['equilibree', 'Équilibrée'], ['grasse', 'Riche en graisses'], ['sucree', 'Riche en sucres'], ['vegetarienne', 'Végétarienne / végane'], ['inconnu', 'Je préfère ne pas répondre']] },
];

function getQrContext() {
  const params = new URLSearchParams(window.location.search);
  const parts = window.location.pathname.split('/').filter(Boolean);
  return {
    patientId: parts.at(-1),
    ref: params.get('ref') || params.get('token') || '',
    token: params.get('token') || params.get('ref') || '',
  };
}

function errorMessage(response) {
  if (response.status === 404) return 'Dossier introuvable ou lien expiré.';
  return 'Le dossier ne peut pas être chargé pour le moment.';
}

export default function App() {
  const context = useMemo(getQrContext, []);
  const [patient, setPatient] = useState(null);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [antecedents, setAntecedents] = useState('');
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!context.patientId) {
      setState('error');
      setMessage('Lien QR invalide. Veuillez scanner à nouveau le QR code.');
      return;
    }
    const query = new URLSearchParams();
    if (context.ref) query.set('ref', context.ref);
    if (context.token) query.set('token', context.token);
    fetch(`${API_URL}/patients/${encodeURIComponent(context.patientId)}/public/?${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(errorMessage(response));
        return response.json();
      })
      .then((data) => {
        setPatient(data);
        setAnswers({
          tabagisme: data.tabagisme || 'inconnu',
          alcool: data.alcool || 'inconnu',
          activite_physique: data.activite_physique || 'inconnu',
          alimentation: data.alimentation || 'inconnu',
        });
        setAntecedents(data.antecedents_familiaux || '');
        setState('ready');
      })
      .catch((error) => {
        setState('error');
        setMessage(error.message);
      });
  }, [context.patientId, context.ref, context.token]);

  const submit = async () => {
    setState('saving');
    const query = new URLSearchParams();
    if (context.ref) query.set('ref', context.ref);
    if (context.token) query.set('token', context.token);
    try {
      const response = await fetch(`${API_URL}/patients/${encodeURIComponent(context.patientId)}/habitudes/?${query}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, antecedents_familiaux: antecedents }),
      });
      if (!response.ok) throw new Error('L’enregistrement a échoué. Réessayez plus tard.');
      setState('success');
    } catch (error) {
      setState('ready');
      setMessage(error.message);
    }
  };

  if (state === 'loading' || state === 'saving') return <Screen><h1>{state === 'saving' ? 'Enregistrement…' : 'Chargement du dossier…'}</h1></Screen>;
  if (state === 'error') return <Screen><h1>Dossier introuvable</h1><p>{message}</p></Screen>;
  if (state === 'success') return <Screen><h1>Merci pour vos réponses</h1><p>Vos informations ont bien été enregistrées dans votre dossier médical.</p></Screen>;

  const section = OPTIONS[step];
  const isLast = step === OPTIONS.length;
  return <main className="app">
    <header><small>REGISTRE NATIONAL DU CANCER</small><h1>Questionnaire de santé</h1><p>Informations confidentielles</p></header>
    <section className="patient"><strong>{patient.nom} {patient.prenom}</strong><span>{patient.age ?? '—'} ans · {patient.wilaya || '—'}</span><em>{patient.registration_number}</em></section>
    <div className="progress"><span>Section {Math.min(step + 1, OPTIONS.length)} sur {OPTIONS.length}</span><div><i style={{ width: `${((step + 1) / OPTIONS.length) * 100}%` }} /></div></div>
    {message && <p className="alert">{message}</p>}
    {!isLast ? <section className="content"><small>SECTION {step + 1} / {OPTIONS.length}</small><h2>{section.title}</h2><p>{section.question}</p>{section.choices.map(([value, label]) => <label className={answers[section.key] === value ? 'choice active' : 'choice'} key={value}><input type="radio" name={section.key} checked={answers[section.key] === value} onChange={() => setAnswers((old) => ({ ...old, [section.key]: value }))} />{label}</label>)}</section> : <section className="content"><small>SECTION {OPTIONS.length} / {OPTIONS.length}</small><h2>Antécédents familiaux</h2><p>Indiquez les cancers ou maladies connus dans votre famille proche. Cette information est facultative.</p><textarea value={antecedents} onChange={(event) => setAntecedents(event.target.value)} placeholder="Ex. père : cancer colorectal ; mère : hypertension" rows="6" /></section>}
    <footer>{step > 0 && <button className="secondary" onClick={() => setStep((value) => value - 1)}>Retour</button>}<button disabled={!isLast && !answers[section.key]} onClick={() => isLast ? submit() : setStep((value) => value + 1)}>{isLast ? 'Envoyer mes réponses' : 'Continuer'}</button></footer>
  </main>;
}

function Screen({ children }) { return <main className="screen">{children}</main>; }
