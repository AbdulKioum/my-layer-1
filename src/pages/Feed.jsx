import ListEditor from '../components/ListEditor'

export default function Feed() {
  return (
    <ListEditor
      title="Feed Price"
      hint="Add feed items with the price per bag. These appear in the Feed Item list on the Homepage table."
      table="feed_items"
      orderCol="name"
      empty="No feed item added yet."
      fields={[
        { key: 'name', label: 'Feed Item', type: 'text', required: true },
        { key: 'price_per_bag', label: 'Price/bag', type: 'number', required: true },
      ]}
    />
  )
}
