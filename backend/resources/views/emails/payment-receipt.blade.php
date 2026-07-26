<x-mail::message>
# Reçu de paiement

Bonjour {{ $name }},

Voici le résumé de votre abonnement **Lecture Scientifique** :

<x-mail::panel>
**Plan :** {{ $planName }}  
**Facturation :** {{ $billingPeriod }}  
**Montant :** {{ $amount }}  
**Dû aujourd'hui :** {{ $dueToday }}  
@if($nextBillingDate)
**Prochaine facturation :** {{ $nextBillingDate }}
@endif
</x-mail::panel>

<x-mail::button :url="$dashboardUrl" color="primary">
Accéder au tableau de bord
</x-mail::button>

Conservez ce courriel comme confirmation. Vous pouvez annuler en tout temps depuis votre compte.

Merci !<br>
L'équipe Lecture Scientifique
</x-mail::message>
