import ListEditor from '../components/ListEditor'

export default function Feed({ isAdmin }) {
  return (
    <ListEditor
      title="Feed Price"
       table="feed_items"
      orderCol="name"
      empty="No feed item added yet."
      readOnly={!isAdmin}
      fields={[
        { key: 'name', label: 'Feed Item', type: 'text', required: true },
        { key: 'price_per_bag', label: 'Price/bag', type: 'number', required: true },
      ]}
    />
  )
}