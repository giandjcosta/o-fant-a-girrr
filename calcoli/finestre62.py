"""Finestre approvate da Gianluca per le aperture future, mai retroattive."""
from datetime import timedelta, timezone

def scadenza(tipo, *, apertura, inizio=None, risultati=None, esistente=None):
    if esistente is not None:
        return esistente
    for d in (apertura, inizio, risultati):
        if d is not None and d.tzinfo is None:
            raise ValueError('Data senza fuso')
    apertura = apertura.astimezone(timezone.utc)
    inizio = inizio.astimezone(timezone.utc) if inizio is not None else None
    risultati = risultati.astimezone(timezone.utc) if risultati is not None else None
    if tipo in ('vigilia', 'sfida'):
        if inizio is None: raise ValueError('Inizio della giornata necessario')
        fine = inizio
    elif tipo == 'dopo':
        if risultati is None: raise ValueError('Pubblicazione dei risultati necessaria')
        fine = risultati + timedelta(hours=48)
    elif tipo == 'mvp':
        if inizio is None: raise ValueError('Inizio della prossima giornata necessario')
        fine = inizio   # Gianluca, 24 novembre 2026: l'MVP della giornata N resta aperto fino al primo calcio d'inizio della N+1
    elif tipo == 'post': fine = apertura + timedelta(hours=24)
    else: raise ValueError('Tipo sconosciuto')
    if fine <= apertura: raise ValueError('Finestra già conclusa: non aprire')
    return fine
