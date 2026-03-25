import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import json

logger = logging.getLogger(__name__)

# === PROMPTS (inchangés) ===
PROMPTS = {
    'patient': """Tu es un assistant médical pour un registre du cancer algérien.
Extrais les informations du patient depuis la dictée vocale du médecin.
Retourne UNIQUEMENT un objet JSON valide avec les champs trouvés.
Champs possibles : nom, prenom, date_naissance (YYYY-MM-DD), lieu_naissance,
sexe (M/F), nationalite, telephone, telephone2, email, adresse, wilaya, commune,
profession, situation_familiale, nombre_enfants, niveau_instruction,
id_national, statut_vital, antecedents_personnels, antecedents_familiaux, notes.
Les dates en français → convertir en YYYY-MM-DD.
N'inclus PAS les champs non mentionnés. Réponds UNIQUEMENT avec le JSON.""",

    'diagnostic': """Tu es un assistant médical pour un registre du cancer algérien.
Extrais les informations du diagnostic depuis la dictée vocale.
Retourne UNIQUEMENT un objet JSON valide avec les champs trouvés.
Champs possibles : topographie_code, topographie_libelle, morphologie_code,
morphologie_libelle, date_diagnostic (YYYY-MM-DD), stade_ajcc, tnm_t, tnm_n, tnm_m,
lateralite, base_diagnostic, observations, compte_rendu_anapath.
Réponds UNIQUEMENT avec le JSON.""",

    'traitement': """Tu es un assistant médical pour un registre du cancer algérien.
Extrais les informations du traitement depuis la dictée vocale.
Retourne UNIQUEMENT un objet JSON valide avec les champs trouvés.
Champs possibles : type_traitement, date_debut, date_fin, protocole,
nombre_cycles, dose, technique, dose_totale, type_chirurgie, intention,
etablissement, medecin_responsable, observations.
Réponds UNIQUEMENT avec le JSON.""",

    'suivi': """Tu es un assistant médical pour un registre du cancer algérien.
Extrais les informations de consultation/suivi depuis la dictée vocale.
Retourne UNIQUEMENT un objet JSON valide avec les champs trouvés.
Champs possibles : date_consultation, motif, poids, taille, tension_arterielle,
performance_status, evolution, observations, plan_traitement, prochain_rdv.
Réponds UNIQUEMENT avec le JSON.""",
}


def get_groq_client():
    """Create and return Groq client with proper error handling."""
    import groq
    
    api_key = getattr(settings, 'GROQ_API_KEY', None)
    
    if not api_key:
        raise ValueError("GROQ_API_KEY n'est pas configurée. Veuillez configurer la variable d'environnement GROQ_API_KEY.")
    
    if not api_key.strip():
        raise ValueError("GROQ_API_KEY est vide. Veuillez configurer une clé API Groq valide.")
    
    return groq.Groq(api_key=api_key)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_voice_fields(request):

    transcript = request.data.get('transcript', '').strip()
    form_type  = request.data.get('form_type', 'patient')

    if not transcript:
        return Response({'fields': {}})

    if form_type not in PROMPTS:
        return Response(
            {'error': f'form_type invalide. Valeurs acceptées : {list(PROMPTS.keys())}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get Groq client with validation
        client = get_groq_client()

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": PROMPTS[form_type]},
                {"role": "user", "content": transcript}
            ],
            temperature=0.2,
            max_tokens=1200,
        )

        text = completion.choices[0].message.content.strip()
        # Remove markdown code block markers using chr for backticks
        backtick = chr(96) * 3
        clean = text.replace(backtick + 'json', '').replace(backtick, '').strip()

        fields = json.loads(clean)

        return Response({
            'fields': fields,
            'transcript': transcript
        })

    except ImportError:
        # groq package not installed
        logger.error("Package 'groq' non installé. Exécutez: pip install groq")
        return Response(
            {'error': 'Service de reconnaissance vocale non configuré. Veuillez installer le package groq.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    except ValueError as ve:
        # API key configuration errors - return 503 Service Unavailable
        logger.error(f"Configuration error: {str(ve)}")
        return Response(
            {'error': 'Service de reconnaissance vocale non configuré. Veuillez contacter l\'administrateur.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    except json.JSONDecodeError:
        return Response(
            {'fields': {}, 'error': 'Extraction impossible — dictée trop peu claire.'},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        # unexpected error (network, groq-specific, etc.)
        # already caught ImportError/ValueError/JSONDecodeError above
        import traceback
        traceback.print_exc()
        logger.exception(f"Erreur lors de l'extraction vocale: {str(e)}")

        # send the actual message back when DEBUG=True so frontend can display it
        payload = {'error': str(e)}
        if settings.DEBUG:
            payload['stack'] = traceback.format_exc()

        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )