import ListEditor from '../components/ListEditor'

export default function Vaccine({ isAdmin }) {
  return (
    <ListEditor
      title="Vaccine"
       table="vaccines"
      orderCol="age_days"
      empty="No vaccine added yet."
      readOnly={!isAdmin}
      fields={[
        { key: 'age_days', label: 'Age (days)', type: 'number', required: true },
        { key: 'name', label: 'Vaccine Name', type: 'text', required: true },
        { key: 'vaccine_type', label: 'Vaccine Type', type: 'select', options: ['Live', 'Killed'] },
        {
          key: 'route',
          label: 'Route',
          type: 'select',
          options: [
            'Eye Drop',
            'Sub Cutaneous',
            'Eye Drop/Drinking Water',
            'Drinking Water',
            'Wing Web',
            'Sub Cutaneous/Muscle',
          ],
        },
        { key: 'note', label: 'Note', type: 'text' },
      ]}
    />
  )
}